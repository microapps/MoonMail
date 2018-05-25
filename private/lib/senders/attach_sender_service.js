// @Deprecated

import { logger } from '../index';
import { Promise } from 'bluebird';
import camelCase from 'camelcase';
import Subscriptions from '../subscriptions/index';

const CONFIG = Subscriptions.planRequirementsConfig;

class AttachSenderService {

  // options parameter holds the information required on limits validation
  static create(sns, userId, plan, senderId, options = {}) {
    const userPlan = plan || 'free';
    const limitsValidationService = new CONFIG.limitsValidatorMapping[userPlan](userId, userPlan, options);
    const fetchSenderInformationService = new CONFIG.fetchSenderInformationMapping[userPlan](userId, senderId, userPlan);
    const checkReputationService = CONFIG.checkUserReputationMapping[userPlan];
    const chargeEmailsService = CONFIG.emailChargerMapping[userPlan] ? new CONFIG.emailChargerMapping[userPlan](userId, options) : null;

    return new AttachSenderService(
      sns,
      userId,
      userPlan,
      senderId,
      limitsValidationService,
      fetchSenderInformationService,
      checkReputationService,
      chargeEmailsService,
      options
    );
  }

  constructor(sns, userId, plan, senderId, limitsValidationService, fetchSenderInformationService, checkReputationService, chargeEmailsService, options = {}) {
    this.sns = sns;
    this.userId = userId;
    this.plan = plan;
    this.senderId = senderId;
    this.limitsValidationService = limitsValidationService;
    this.fetchSenderInformationService = fetchSenderInformationService;
    this.checkReputationService = checkReputationService;
    this.chargeEmailsService = chargeEmailsService;
    this.options = options;
    this.precompileCampaignTopicArn = process.env.PRECOMPILE_CAMPAIGN_TOPIC_ARN;
    this.updateCampaignStatusTopicArn = process.env.UPDATE_CAMPAIGN_TOPIC_ARN;
  }

  attachSender() {
    logger().debug('= AttachSenderService.attachSender', this.userId, this.plan, this.options);
    return this.limitsValidationService.validate(this.userId, this.plan, this.options)
      .then(() => this._checkUserReputation())
      .then(() => this.fetchSenderInformationService.getData())
      .then(senderData => this._chargeEmails(senderData))
      .then(senderData => this._buildAttachSenderMessage(senderData))
      .then(senderMessage => this._publishSuccessMessage(senderMessage))
      .catch((err) => {
        logger().error('= AttachSenderService.attachSender', 'Error', JSON.stringify(this.options), err, err.stack);
        return this._publishErrorMessage({
          userId: this.userId,
          status: camelCase(err.name),
          campaignId: this.options.campaign.id
        });
      });
  }

  _checkUserReputation() {
    if (!this.checkReputationService) Promise.resolve(true);
    return Promise.resolve(this.checkReputationService.validate(this.userId));
  }

  _chargeEmails(senderData) {
    if (!this.chargeEmailsService) Promise.resolve(senderData);
    return this.chargeEmailsService.charge(senderData)
      .catch(error => Promise.reject(Subscriptions.handleStripeErrors(error)));
  }

  _buildAttachSenderMessage(data) {
    logger().debug('= AttachSenderService._buildAttachSenderMessage', data);
    this.options.sender = data;
    return Promise.resolve(this.options);
  }

  _publishSuccessMessage(canonicalMessage) {
    return this._publishToSns(canonicalMessage, this.precompileCampaignTopicArn);
  }

  _publishErrorMessage(canonicalMessage) {
    return this._publishToSns(canonicalMessage, this.updateCampaignStatusTopicArn);
  }

  _publishToSns(canonicalMessage, topic) {
    logger().debug('= AttachSenderService.publishToSns', 'Sending canonical message', topic, JSON.stringify(canonicalMessage));
    const params = {
      Message: JSON.stringify(canonicalMessage),
      TopicArn: topic
    };
    this.sns.publish(params).promise();
  }

}

module.exports.AttachSenderService = AttachSenderService;
