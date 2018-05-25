import { Promise } from 'bluebird';
import camelCase from 'camelcase';
import { User } from 'moonmail-models';
import { FetchFreeSenderInformationService } from './fetch_free_sender_information_service';
import { FetchPaidSenderInformationService } from './fetch_paid_sender_information_service';
import Subscriptions from '../subscriptions/index';
import ReputationControls from '../reputation/index';
import { logger } from '../index';

const Senders = {

  attachSender(snsClient, { userId, userPlan, campaign, currentUserState, user, ...rest }) {
    const inputMessage = { userId, userPlan, campaign, currentUserState, user,  ...rest };
    const plan = userPlan || 'free';
    const { sentCampaignsInLastDay, recipientsCount, totalRecipients } = currentUserState;
    const senderId = campaign.senderId;
    const limitValidator = Subscriptions.planRequirements.limitValidators[plan]({ sentCampaignsInLastDay, recipientsCount, totalRecipients });
    const emailCharger = Subscriptions.planRequirements.emailChargers[plan](userId, campaign, { sentCampaignsInLastDay, recipientsCount, totalRecipients });
    const senderDataProvider = senderId ? new FetchPaidSenderInformationService(userId, senderId) : new FetchFreeSenderInformationService(userId);
    const reputationValidator = ReputationControls;

    return this.ensureSenderExistance(senderDataProvider)
      .then(() => limitValidator.perform())
      .then(() => reputationValidator.perform(userId))
      .then(() => emailCharger.perform())
      .then(() => this.buildAttachSenderCanonicalMessage(senderDataProvider, inputMessage))
      .then(canonicalMessage => this.publishAttachSenderCanonicalMessage(snsClient, canonicalMessage))
      .catch((err) => this.handleErrors(snsClient, campaign, user, err))
      .catch((err) => {
        logger().error('= Senders.attachSender', JSON.stringify(inputMessage), err, err.stack);
        return this.publishAttachSenderUnsuccessfulMessage(snsClient, {
          userId,
          status: `${camelCase(err.name)}. ${err.message}`,
          campaignId: campaign.id
        });
      });
  },

  fetchSender(userId, senderId) {
    const provider = senderId
      ? new FetchPaidSenderInformationService(userId, senderId)
      : new FetchFreeSenderInformationService(userId);
    return this.fetchSenderData(provider);
  },

  ensureSenderExistance(senderDataProvider) {
    return this.fetchSenderData(senderDataProvider);
  },

  fetchSenderData(senderDataProvider) {
    return senderDataProvider.getData();
  },

  buildAttachSenderCanonicalMessage(senderDataProvider, inputMessage) {
    return this.fetchSenderData(senderDataProvider)
      .then(senderData => Object.assign({}, inputMessage, { sender: senderData }));
  },

  publishAttachSenderCanonicalMessage(snsClient, canonicalMessage) {
    logger().info('= Senders.publishAttachSenderCanonicalMessage', JSON.stringify(canonicalMessage));
    const params = {
      Message: JSON.stringify(canonicalMessage),
      TopicArn: process.env.PRECOMPILE_CAMPAIGN_TOPIC_ARN
    };
    return snsClient.publish(params).promise();
  },

  publishAttachSenderUnsuccessfulMessage(snsClient, errorMessage) {
    logger().info('= Senders.publishAttachSenderUnsuccessfulMessage', JSON.stringify(errorMessage));
    const params = {
      Message: JSON.stringify(errorMessage),
      TopicArn: process.env.UPDATE_CAMPAIGN_TOPIC_ARN
    };
    return snsClient.publish(params).promise();
  },

  async publishErrorToSMS(snsClient, campaign, user, errorMessage) { 
    logger().error('= Senders.publishErrorToSMS', JSON.stringify(errorMessage));
    try {
      if (campaign && campaign.scheduledAt && user && user.phoneNumber && user.notifications && user.notifications.isSmsOnDeliveryEnabled != false ) {
        const snsParams = {
          Message: `MoonMail: Your campaign ${ campaign.name  } was not sent due to credit card problems.`,
          MessageStructure: 'string',
          PhoneNumber: user.phoneNumber
        };

        await snsClient.publish(snsParams).promise();

        return Promise.resolve();
      }
      return Promise.resolve();
    } catch (e) {
      throw e.toString();
    }
  },

  async handleErrors(snsClient, campaign, user, errorMessage) {
    logger().error('= Senders.handleErrors', JSON.stringify(errorMessage));
    try {
      if (errorMessage && errorMessage.name && errorMessage.name == 'PaymentGatewayError') {
        await this.publishErrorToSMS(snsClient, campaign, user, errorMessage);
      }
  
      return Promise.reject(errorMessage);
    } catch (e) {
      logger().error('= Senders.handleErrors, CATCH-ERROR ', e);
      return Promise.reject(errorMessage);
    }
  }
};

export default Senders;