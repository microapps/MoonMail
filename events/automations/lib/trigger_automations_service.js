import Promise from 'bluebird';
import moment from 'moment';
import cuid from 'cuid';
import { AutomationAction, ScheduledEmail } from 'moonmail-models';
import FootprintCalculator from '../../lib/footprint_calculator';
import { Email } from '../../lib/email';
import FunctionsClient from '../../lib/functions_client';
import { logger } from '../../lib/index';

export default class TriggerAutomationsService {
  static execute(events = []) {
    logger().info('TriggerAutomationsService.execute', JSON.stringify(events));
    return Promise.resolve(events)
      .then(events => this._groupByFootprint(events))
      .then(eventsByFootprint => this._eventsByTriggeredAutomation(eventsByFootprint))
      .then(result => this._scheduleEmails(result));
  }

  static get fetchSenderFunctionName() {
    return process.env.FETCH_SENDER_FN_NAME;
  }

  static _groupByFootprint(events = []) {
    return events.reduce((byFootprint, event) => {
      const footprint = FootprintCalculator.calculate(event, 'event');
      byFootprint[footprint] = byFootprint[footprint] ? byFootprint[footprint].concat(event) : [event];
      return byFootprint;
    }, {});
  }

  static _eventsByTriggeredAutomation(footprintEvents) {
    logger().debug('_eventsByTriggeredAutomation', JSON.stringify(footprintEvents));
    const footprints = Object.keys(footprintEvents);
    return Promise.reduce(footprints, (total, fp) =>
      AutomationAction.allByStatusAndFootprint('active', fp)
        .then(automations => automations.items || [])
        .then(automations => automations.map(automation => ({automation, events: footprintEvents[fp]})))
        .then(automationEvents => total.concat(automationEvents))
        .catch(() => total)
    , []);
  }

  static _scheduleEmails(eventsByAutomations) {
    logger().debug('_scheduleEmails', JSON.stringify(eventsByAutomations));
    return Promise.map(eventsByAutomations, el => this._scheduleAutomationEmails(el), {concurrency: 5});
  }

  static _scheduleAutomationEmails({automation, events}) {
    logger().debug('_scheduleAutomationEmails', JSON.stringify({automation, events}));
    return this._fetchAutomationSender(automation)
      .then(sender => this._buildCommonEmailParams(sender, automation))
      .then(commonEmailParams => this._buildEmails(commonEmailParams, automation, events))
      .then(emails => this._doScheduleAutomationEmails(emails))
      .catch(() => []);
  }

  static _fetchAutomationSender(automation) {
    logger().debug('_fetchAutomationSender', JSON.stringify({automation}));
    const payload = {userId: automation.userId, senderId: automation.senderId};
    logger().debug('_fetchAutomationSender', JSON.stringify(payload));
    return FunctionsClient.execute(this.fetchSenderFunctionName, payload);
  }

  static _buildCommonEmailParams(sender, automationAction) {
    logger().debug('_buildCommonEmailParams', JSON.stringify({automationAction, sender}));
    return {
      id: cuid(),
      userId: automationAction.userId,
      sender,
      status: 'scheduled',
      scheduledAt: moment().unix() + (automationAction.delay || 0),
      automationId: automationAction.automationId,
      automationActionId: automationAction.id
    };
  }

  static _buildEmails(commonEmailParams, automation, events) {
    return Promise.map(events, event => this._buildEmail(commonEmailParams, automation, event));
  }

  static _buildEmail(commonEmailParams, automation, event) {
    return this._addRecipientToEmail(commonEmailParams, event)
      .then(email => this._addCampaignToEmail(email, automation))
      .then(email => this._precompileEmail(email));
  }

  static _addRecipientToEmail(email, event) {
    const recipient = event.payload.recipient;
    return Promise.resolve(Object.assign({}, email, {recipient}));
  }

  static _addCampaignToEmail(email, automation) {
    const campaign = automation.campaign;
    return Object.assign({}, email, { campaign });
  }

  static _precompileEmail(email) {
    const emailParser = new Email({
      fromEmail: email.sender.emailAddress,
      to: email.recipient.email,
      body: email.campaign.body,
      subject: email.campaign.subject,
      metadata: email.recipient.metadata,
      recipientId: email.recipient.id,
      campaignId: email.id,
      listId: email.recipient.listId
    }, {footer: false});
    return Promise.all([
      emailParser.renderBody().then(body => emailParser.appendOpensPixel(body)),
      emailParser.renderSubject(),
      emailParser.unsubscribeUrl
    ])
    .then(result => {
      const scheduledEmail = Object.assign({}, email, { campaign: { body: result[0], subject: result[1], id: email.automationActionId } });
      if (result[2]) scheduledEmail.recipient.unsubscribeUrl = result[2];
      return scheduledEmail;
    });
  }

  static _doScheduleAutomationEmails(emails = []) {
    const chunkSize = 25;
    const emailGroups = emails.map((e, i) => (i % chunkSize === 0 ? emails.slice(i, i + chunkSize) : null))
      .filter(e => e);
    const schedulePromises = emailGroups.map(group => ScheduledEmail.saveAll(group).catch());
    return Promise.all(schedulePromises);
  }
}
