import Promise from 'bluebird';
import { debug } from './index';
import { Recipient } from 'moonmail-models';
import * as async from 'async';

class AttachRecipientsService {
  constructor(snsClient, campaignMessage) {
    this.snsClient = snsClient;
    this.campaignMessage = campaignMessage;
  }

  execute() {
    if (this.campaignMessage.campaign.segmentId) return this.notifyAttachSegmentMembers();
    return this.notifyAttachListRecipients();
  }

  notifyAttachSegmentMembers() {
    debug('= AttachRecipientsService.attachSegmentmembers', this.campaignMessage.campaign.segmentId);
    return this._notifyAttachSegmentMembers(this._buildAttachSegmentMembersMessage())
      .then(() => this._notifyToUpdateCampaignStatus())
      .then(() => this._wait(20000))
      .then(() => this._notifyToSendEmails())
      .then(() => this._notifyToSendSMS());
  }

  notifyAttachListRecipients() {
    debug('= AttachRecipientsService.attachListRecipients', this.campaignMessage.campaign.listIds);
    return Promise.map(this.campaignMessage.campaign.listIds, listId => this._notifyAttachListRecipients(this._buildAttachListRecipientsMessage(listId)), { concurrency: 5 })
      .then(() => this._notifyToUpdateCampaignStatus())
      .then(() => this._wait(20000))
      .then(() => this._notifyToSendEmails())
      .then(() => this._notifyToSendSMS());
  }

  _buildAttachListRecipientsMessage(listId) {
    return {
      sender: this.campaignMessage.sender,
      campaign: this.campaignMessage.campaign,
      userId: this.campaignMessage.userId,
      userPlan: this.campaignMessage.userPlan || 'free',
      appendFooter: this.campaignMessage.appendFooter,
      list: this.campaignMessage.list,
      listId
    };
  }

  // Fanout
  _notifyAttachListRecipients(attachListRecipientsMessage) {
    debug('= AttachRecipientsService._notifyAttachListRecipients', JSON.stringify(attachListRecipientsMessage));
    const params = {
      TopicArn: process.env.ATTACH_LIST_RECIPIENTS_TOPIC_ARN,
      Message: JSON.stringify(attachListRecipientsMessage)
    };
    return this.snsClient.publish(params).promise();
  }

  _buildAttachSegmentMembersMessage() {
    return {
      sender: this.campaignMessage.sender,
      campaign: this.campaignMessage.campaign,
      userId: this.campaignMessage.userId,
      userPlan: this.campaignMessage.userPlan || 'free',
      list: this.campaignMessage.list
    };
  }

  // Fanout
  _notifyAttachSegmentMembers(attachSegmentMembersMessage) {
    debug('= AttachRecipientsService._notifyAttachSegmentMembers', JSON.stringify(attachSegmentMembersMessage));
    const params = {
      TopicArn: process.env.ATTACH_SEGMENTS_RECIPIENTS_TOPIC_ARN,
      Message: JSON.stringify(attachSegmentMembersMessage)
    };
    return this.snsClient.publish(params).promise();
  }

  _notifyToUpdateCampaignStatus() {
    debug('= AttachRecipientsService._notifyToUpdateCampaignStatus', JSON.stringify(this.campaignMessage));
    const campaignStatus = {
      status: 'sent',
      campaignId: this.campaignMessage.campaign.id,
      userId: this.campaignMessage.userId
    };
    const params = {
      TopicArn: process.env.UPDATE_CAMPAIGN_TOPIC_ARN,
      Message: JSON.stringify(campaignStatus)
    };
    return this.snsClient.publish(params).promise();
  }

  _notifyToSendEmails() {
    debug('= AttachRecipientsService._notifyToSendEmails', JSON.stringify(this.campaignMessage));
    const snsParams = {
      TopicArn: process.env.SEND_EMAILS_TOPIC_ARN,
      Message: JSON.stringify({ QueueName: this.campaignMessage.userId.replace('|', '_') })
    };
    return this.snsClient.publish(snsParams).promise();
  }

  async _notifyToSendSMS() {
    debug('= AttachRecipientsService._notifyToSendSMS', JSON.stringify(this.campaignMessage));
    try {  
      const campaign = this.campaignMessage.campaign;
      const user = this.campaignMessage.user;

      if(!user.notifications){
        user.notifications = { };
      }
  
      if (campaign && campaign.scheduledAt && user && user.phoneNumber && user.notifications && user.notifications.isSmsOnDeliveryEnabled != false) {
        const snsParams = {
          Message: `MoonMail: We have just sent your campaign ${ campaign.name  }. https://app.moonmail.io/campaigns/${ campaign.id  }`,
          MessageStructure: 'string',
          PhoneNumber: user.phoneNumber
        };
  
        return this.snsClient.publish(snsParams).promise();
      }
  
      return Promise.resolve();
    } catch (error) {
      debug('= AttachRecipientsService._notifyToSendSMS ERROR', error);
    }
  }

  _wait(time) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
}

module.exports.AttachRecipientsService = AttachRecipientsService;