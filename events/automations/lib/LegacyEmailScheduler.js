import Promise from 'bluebird';
import { ScheduledEmail } from 'moonmail-models';
import moment from 'moment';
import cuid from 'cuid';
import { Email } from '../../lib/email';
import { logger } from '../../lib/index';

export default class LegacyEmailScheduler {
  static scheduleBatch(emailsBatch = []) {
    return new LegacyEmailScheduler(emailsBatch).scheduleBatch();
  }

  constructor(emailsBatch) {
    this.emailsBatch = emailsBatch;
  }

  scheduleBatch() {
    return this.buildScheduledEmails()
      .then(emails => this.scheduleEmails(emails));
  }

  buildScheduledEmails() {
    return Promise.map(this.emailsBatch, email => this.buildScheduledEmail(email));
  }

  buildScheduledEmail(email) {
    const baseScheduledEmail = {
      id: cuid(),
      userId: email.metadata.userId,
      sender: email.sender,
      status: 'scheduled',
      scheduledAt: moment().unix() + (email.delay || 0),
      automationId: email.metadata.automationId,
      automationActionId: email.metadata.automationActionId,
      recipient: email.recipient
    };
    return this.precompileEmailCampaign(email)
      .then(([body, subject, unsubscribeUrl]) => {
        const scheduledEmail = Object.assign({}, baseScheduledEmail, { campaign: { body, subject, id: email.metadata.campaignId } });
        if (unsubscribeUrl) scheduledEmail.recipient.unsubscribeUrl = unsubscribeUrl;
        return scheduledEmail;
      });
  }

  precompileEmailCampaign(email) {
    const emailParser = new Email({
      fromEmail: email.sender.emailAddress,
      to: email.recipient.email,
      body: email.email.body,
      subject: email.email.subject,
      metadata: email.recipient.metadata,
      recipientId: email.recipient.id,
      campaignId: email.metadata.campaignId,
      listId: email.recipient.listId,
      userId: email.metadata.userId
    }, { footer: false });
    return Promise.all([
      emailParser.renderBody().then(body => emailParser.appendOpensPixel(body)),
      emailParser.renderSubject(),
      emailParser.unsubscribeUrl
    ]);
  }

  scheduleEmails(emails = []) {
    const chunkSize = 25;
    const emailGroups = emails.map((e, i) => (i % chunkSize === 0 ? emails.slice(i, i + chunkSize) : null))
      .filter(e => e);
    const schedulePromises = emailGroups.map(group => {
      return ScheduledEmail.saveAll(group).catch(() => true)
    });
    return Promise.all(schedulePromises);
  }
}
