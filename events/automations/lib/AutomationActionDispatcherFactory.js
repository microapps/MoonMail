import R from 'ramda';
import ConditionalAutomationActionDispatcher from './ConditionalAutomationActionDispatcher';
import ConditionalDeferredAutomationActionDispatcher from './ConditionalDeferredAutomationActionDispatcher';
import UnconditionalAutomationActionDispatcher from './UnconditionalAutomationActionDispatcher';

export default class AutomationActionDispatcherFactory {
  static build(automationAction, events) {
    return new AutomationActionDispatcherFactory(automationAction, events).build();
  }

  constructor(automationAction, events) {
    this.automationAction = automationAction;
    this.events = events;
  }

  build() {
    if (this.isDeferred()) return new ConditionalDeferredAutomationActionDispatcher(this.automationAction, this.events);
    if (this.isConditional()) return new ConditionalAutomationActionDispatcher(this.automationAction, this.events);
    return new UnconditionalAutomationActionDispatcher(this.automationAction, this.events);
  }

  isConditional() {
    const conditionsAreEmpty = R.pipe(
      R.propOr([], 'conditions'),
      R.isEmpty
    )(this.automationAction);
    return R.not(conditionsAreEmpty);
  }

  isDeferred() {
    const conditions = R.propOr([], 'conditions', this.automationAction);
    const getDelay = R.propOr(0, 'delay');
    const maxConditionsDelay = R.reduce((max, current) => R.max(max, getDelay(current)), 0, conditions);
    return this.isConditional() && maxConditionsDelay > 0;
  }
}
