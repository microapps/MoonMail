import AutomationActionDispatcher from './AutomationActionDispatcher';

export default class ConditionalDeferredAutomationActionDispatcher extends AutomationActionDispatcher {
  constructor(automationAction = {}, events = []) {
    super(automationAction, events);
  }

  dispatch() {
    return Promise.resolve('Temporary stub');
  }
}

