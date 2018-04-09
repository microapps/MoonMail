import { Recipient } from 'moonmail-models';
import omitEmpty from 'omit-empty';
import Promise from 'bluebird';
import FunctionsClient from '../../lib/functions_client';

export default class AutomationActionDispatcher {
  static build(automationAction, events) {
    return new AutomationActionDispatcher(automationAction, events).build();
  }

  get fetchSenderFunctionName() {
    return process.env.FETCH_SENDER_FN_NAME;
  }

  constructor(automationAction, events) {
    this.automationAction = automationAction;
    this.events = events;
  }

  fetchAutomationSender() {
    const payload = { userId: this.automationAction.userId, senderId: this.automationAction.senderId };
    return FunctionsClient.execute(this.fetchSenderFunctionName, payload);
  }

  buildEmails(sender) {
    return Promise.map(this.events, event => this.fetchEventRecipient(event.payload)
      .then(recipient => this.buildEmail(sender, recipient, event.payload)));
  }

  buildEmail(sender, recipient, eventPayload = {}) {
    return omitEmpty({
      email: {
        body: this.automationAction.campaign.body,
        subject: this.automationAction.campaign.subject
      },
      metadata: {
        campaignId: this.automationAction.id,
        automationActionId: this.automationAction.id,
        automationId: this.automationAction.automationId,
        listId: recipient.listId,
        userId: this.automationAction.userId,
        segmentId: eventPayload.segmentId
      },
      sender,
      recipient,
      delay: this.automationAction.delay
    });
  }

  fetchEventRecipient(eventPayload = {}) {
    return eventPayload.recipient
      ? Promise.resolve(eventPayload.recipient)
      : Recipient.get(eventPayload.listId, eventPayload.recipientId);
  }
}
