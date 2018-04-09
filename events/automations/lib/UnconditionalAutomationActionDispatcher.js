import AutomationActionDispatcher from './AutomationActionDispatcher';
import EmailScheduler from './email_scheduler';

export default class UnconditionalAutomationActionDispatcher extends AutomationActionDispatcher {
  constructor(automationAction = {}, events = []) {
    super(automationAction, events);
  }

  dispatch() {
    return this.fetchAutomationSender()
      .then(sender => this.buildEmails(sender))
      .then(emails => EmailScheduler.scheduleBatch(emails));
  }
}
