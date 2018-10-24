import { logger } from './index';
import { EmailQueue } from './email_queue';
import { Email } from './email';
import { LinksParser } from './links_parser';
import { compressString, uncompressString } from './utils';

class PrecompileEmailService {
  constructor(sqsClient, emailParams) {
    this.emailParams = emailParams;
    this.apiHost = process.env.API_HOST;
    this.clicksHost = process.env.CLICKS_HOST;
    this.queue = new EmailQueue(sqsClient, { name: this.queueName });
    const uncompressedBody = uncompressString(emailParams.campaign.body);
    const campaignMetadata = this._buildCampaignMetadata(emailParams.campaign);
    const recipientMetadata = emailParams.recipient.metadata || {};
    const metadata = Object.assign({}, recipientMetadata, campaignMetadata);
    this.email = new Email({
      fromEmail: emailParams.sender.emailAddress,
      fromName: emailParams.sender.fromName,
      to: emailParams.recipient.email,
      body: uncompressedBody,
      subject: emailParams.campaign.subject,
      metadata,
      recipientId: emailParams.recipient.id,
      campaignId: emailParams.campaign.id,
      listId: emailParams.recipient.listId,
      userId: emailParams.userId,
      userPlan: emailParams.userPlan,
      list: emailParams.list
    },
      { footer: this._needsFooter(emailParams) });
  }

  composeEmail() {
    return new Promise((resolve, reject) => {
      logger().debug('= PrecompileEmailService.composeEmail', 'Composing email');
      const parsedBodyPromise = this.composeBody();
      const parsedSubjectPromise = this.email.renderSubject();
      Promise.all([parsedBodyPromise, parsedSubjectPromise])
        .then((values) => {
          const parsedBody = values[0];
          const parsedSubject = values[1];
          let composedEmail = Object.assign({}, this.emailParams);
          const compressedParsedBody = compressString(parsedBody);
          Object.assign(composedEmail.campaign, { subject: parsedSubject, body: compressedParsedBody });
          Object.assign(composedEmail.recipient, { unsubscribeUrl: this.email.unsubscribeUrl, resubscribeUrl: this.email.resubscribeUrl });
          logger().debug('= PrecompileEmailService.composeEmail', 'Composed email', composedEmail);
          resolve(composedEmail);
        })
        .catch(reject);
    });
  }

  composeBody() {
    return this.email.renderBody()
      .then(body => this._addTracking(body, this.emailParams));
  }

  _addTracking(body, context) {
    const linksParser = new LinksParser({ apiHost: this.apiHost, context, clicksHost: this.clicksHost });
    return linksParser.appendRecipientIdToLinks(body)
      .then(parsedBody => linksParser.appendOpensPixel(parsedBody));
  }

  enqueueEmail() {
    return new Promise((resolve, reject) => {
      logger().debug('= PrecompileEmailService.enqueueEmail()', 'Enqueuing email');
      this.composeEmail()
        .then((composedEmail) => {
          logger().debug('= PrecompileEmailService.enqueueEmail', 'Got the composed email', composedEmail);
          resolve(this.queue.putMessage(composedEmail));
        })
        .catch((err) => {
          logger().debug('= PrecompileEmailService.enqueueEmail', 'Some error occurred');
          reject(err);
        });
    });
  }

  _needsFooter(emailParams) {
    const userPlan = emailParams.userPlan;
    const freePlanRegex = /free/;
    return (!userPlan) || (userPlan.match(freePlanRegex)) || (userPlan === 'staff') || (emailParams.appendFooter);
  }

  _buildCampaignMetadata(campaign = {}) {
    if (campaign.metadata && campaign.metadata.address) {
      const address = campaign.metadata.address;
      const subject = campaign.subject || ''
      const addressTag = `<p style="text-align: center;"><b>Our address is:</b></br>${address.company}</br>${address.address} ${address.address2}</br>${address.zipCode} ${address.city}</br>${address.state} ${address.country}</br><p>`;
      return { address: addressTag, subject };
    } else {
      return {};
    }
  }

  get queueName() {
    return this.emailParams.userId.replace('|', '_');
  }
}

module.exports.PrecompileEmailService = PrecompileEmailService;
