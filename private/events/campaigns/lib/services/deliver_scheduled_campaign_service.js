import Promise from 'bluebird';
import { Campaign, List } from 'moonmail-models';
import inlineCss from 'inline-css';
import omitEmpty from 'omit-empty';
import { debug } from '../../../../lib/index';
import { compressString } from '../../../../lib/utils';
import FunctionsClient from '../../../../lib/functions_client';

class DeliverScheduledCampaignService {

  constructor(snsClient, { campaignId, user } = {}) {
    this.snsClient = snsClient; 
    this.campaignId = campaignId;
    this.campaignMetadata = {address: user.address};
    this.userId = user.id;
    this.userPlan = user.plan || 'free';
    this.userPhone = user.phoneNumber;
    this.userNotifications = user.notifications;
    this.appendFooter = user.appendFooter;
    this.currentState = {};
    this.attachRecipientsCountTopicArn = process.env.ATTACH_RECIPIENTS_COUNT_TOPIC_ARN;
    this.updateCampaignStatusTopicArn = process.env.UPDATE_CAMPAIGN_TOPIC_ARN;
  }

  sendCampaign() {
    debug('= DeliverScheduledCampaignService.sendCampaign', `Sending campaign with id ${this.campaignId}`);
    return this.checkUserQuota()
      .then(() => this._getCampaign())
      .then(campaign => this._checkCampaign(campaign))
      .then(campaign => this._compressCampaignBody(campaign))
      .then(campaign => this._buildCampaignMessage(campaign, this.campaignMetadata))
      .then(canonicalMessage => this._unscheduleCampaign(canonicalMessage))
      .then(canonicalMessage => this._forwardCanonicalMessage(canonicalMessage))
      .then(() => this._updateCampaignStatus('pending'))
      .catch(err => this._handleError(err));
  }

  checkUserQuota() {
    debug('= DeliverCampaignService._checkUserQuota', this.userId);
    return Promise.props({
      sentCampaignsInLastDay: Campaign.sentLastNDays(this.userId, 1),
      recipientsCount: this._getRecipientsCount(),
      totalRecipients: this._getTotalRecipients()
    }).then((currentState) => {
      this.currentState = currentState;
      return this._checkSubscriptionLimits(currentState);
    });
  }

  _getRecipientsCount() {
    // Probably this should relay in a micro-service instead of calling Lists directly
    return this._getLists()
      .then(lists => this._countRecipients(lists));
  }

  _getLists() {
    return this._getCampaign()
      .then((campaign) => {
        const listIds = campaign.listIds;
        if (listIds) {
          const getListPromises = listIds.map(listId => List.get(this.userId, listId));
          return Promise.all(getListPromises);
        }
        return Promise.resolve();
      });
  }

  _countRecipients(lists) {
    if (lists) {
      const count = lists.reduce((accum, next) => (accum + next.subscribedCount), 0);
      return Promise.resolve(count);
    }
    return Promise.resolve(0);
  }

  _getCampaign() {
    return new Promise((resolve, reject) => {
      if (this.campaignId && this.userId) {
        debug('= DeliverScheduledCampaignService._getCampaign', `ID ${this.campaignId} and user ID ${this.userId} was provided`);
        resolve(Campaign.get(this.userId, this.campaignId));
      } else {
        debug('= DeliverScheduledCampaignService._getCampaign', 'No info provided');
        reject('No campaign info provided');
      }
    });
  }

  _compressCampaignBody(campaign) {
    return new Promise((resolve, reject) => {
      const compressedBody = compressString(campaign.body);
      const compressedCampaign = Object.assign({}, campaign, { body: compressedBody });
      resolve(compressedCampaign);
    });
  }

  _checkCampaign(campaign) {
    debug('= DeliverScheduledCampaignService._checkCampaign', JSON.stringify(campaign));
    return new Promise((resolve, reject) => {
      if (Campaign.isValidToBeSent(campaign)) {
        resolve(campaign);
      } else {
        reject('campaignNotReady');
      }
    });
  }

  _buildCampaignMessage(campaign, campaignMetadata) {
    debug('= DeliverScheduledCampaignService._buildCampaignMessage', campaign);
    return new Promise((resolve) => {
      inlineCss(campaign.body, { url: './' })
        .then((inlinedBody) => {
          resolve(omitEmpty({
            userId: campaign.userId,
            userPlan: this.userPlan,
            appendFooter: this.appendFooter,
            currentUserState: this.currentState,
            campaign: {
              id: campaign.id,
              subject: campaign.subject,
              name: campaign.name,
              body: inlinedBody,
              senderId: campaign.senderId,
              precompiled: false,
              listIds: campaign.listIds,
              attachments: campaign.attachments,
              metadata: campaignMetadata,
              scheduledAt: campaign.scheduledAt
            },
            user: {
              id: this.userId,
              phoneNumber: this.userPhone,
              notifications: this.userNotifications
            }
          }));
        });
    });
  }

  _unscheduleCampaign(canonicalMessage) {
    return Campaign.cancelSchedule(this.userId, this.campaignId)
      .then(() => canonicalMessage);
  }

  _forwardCanonicalMessage(canonicalMessage) {
    debug('= DeliverScheduledCampaignService._forwardCanonicalMessage', 'Sending canonical message', JSON.stringify(canonicalMessage));
    return this._publishToSns(canonicalMessage, this.attachRecipientsCountTopicArn);
  }

  _updateCampaignStatus(status = 'pending') {
    debug('= DeliverScheduledCampaignService._updateCampaignStatus');
    const campaignStatus = { campaignId: this.campaignId, userId: this.userId, status };
    return this._publishToSns(campaignStatus, this.updateCampaignStatusTopicArn);
  }

  _publishToSns(message, topic) {
    const params = {
      Message: JSON.stringify(message),
      TopicArn: topic
    };
    return this.snsClient.publish(params).promise();
  }

  _handleError(err) {
    return this._updateCampaignStatus(err.toString());
  }

  _checkSubscriptionLimits({ sentCampaignsInLastDay, recipientsCount, totalRecipients }) {
    const lambdaName = process.env.CHECK_SUBSCRIPTION_LIMITS_FUNCTION;
    debug('= DeliverCampaignService.invokeLambda', lambdaName);
    const payload = { userId: this.userId, currentState: { sentCampaignsInLastDay: sentCampaignsInLastDay + 1, recipientsCount, totalRecipients } };
    return FunctionsClient.execute(lambdaName, payload)
      .then(response => (response.quotaExceeded ? Promise.reject('limitReached') : Promise.resolve({})));
  }

  _getTotalRecipients() {
    return FunctionsClient.execute(process.env.GET_TOTAL_RECIPIENTS_FUNCTION, { userId: this.userId })
      .then(response => response.totalRecipients);
  }
}

module.exports.DeliverScheduledCampaignService = DeliverScheduledCampaignService;
