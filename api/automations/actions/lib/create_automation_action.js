import cuid from 'cuid';
import R from 'ramda';
import { Automation, AutomationAction } from 'moonmail-models';
import { newError, paramsChecker } from '../../../lib/api-utils';
import FootprintCalculator from './footprint_calculator';

class DefaultAutomationActionFactory {
  static execute({ automation, automationAction }) {
    return new DefaultAutomationActionFactory({ automation, automationAction }).execute();
  }

  constructor({ automation, automationAction }) {
    this.automation = automation;
    this.automationAction = automationAction;
  }

  execute() {
    const { userId, listId, status, senderId } = this.automation;
    const id = cuid();
    const action = Object.assign(
      { delay: 0, automationId: this.automation.id },
      this.automationAction,
      { userId, listId, status, senderId, id }
    );
    const footprint = FootprintCalculator.calculate(action);
    action.footprint = footprint;
    return action;
  }
}

class NotOpenedAutomationActionFactory {
  static execute({ automation, automationAction }) {
    return new NotOpenedAutomationActionFactory({ automation, automationAction }).execute();
  }

  constructor({ automation, automationAction }) {
    this.automation = automation;
    this.automationAction = automationAction;
  }

  execute() {
    const { userId, listId, status, senderId } = this.automation;
    const id = cuid();
    const triggerEventType = 'email.delivered';
    const conditions = [{
      type: 'aggregationCount',
      resource: 'recipient.activity',
      filters: [
        { campaignId: { eq: id } },
        { eventType: { eq: 'email.opened' } }
      ],
      count: 0,
      delay: this.automationAction.delay
    }];
    const action = Object.assign(
      { automationId: this.automation.id },
      this.automationAction,
      { delay: 0, userId, listId, status, senderId, id, triggerEventType, conditions }
    );
    const footprint = FootprintCalculator.calculate(action);
    action.footprint = footprint;
    return action;
  }
}

export default class CreateAutomaionAction {
  static execute({ automationId, userId, automationAction }) {
    return this._getAutomation(userId, automationId)
      .then(automation => this._createAutomationAction(automation, automationAction));
  }

  static _getAutomation(userId, automationId) {
    const requiredProps = ['status', 'listId', 'userId', 'id'];
    const checkProperties = paramsChecker(requiredProps);
    return Automation.get(userId, automationId)
      .then(checkProperties)
      .catch(() =>
        Promise.reject(newError('InvalidAutomation', 'The provided automation is invalid', 401)));
  }

  static _createAutomationAction(automation, automationAction) {
    const requiredProps = ['name', 'type'];
    const checkProperties = paramsChecker(requiredProps);
    return checkProperties(automationAction)
      .then(action => this._buildAutomationAction({ automationAction: action, automation }))
      .then(action => this._doCreateAutomationAction(action));
  }

  static _buildAutomationAction({ automationAction, automation }) {
    const actionTypeFactoryMapping = { 'campaign.not.opened': NotOpenedAutomationActionFactory };
    const factory = R.propOr(DefaultAutomationActionFactory, automationAction.type, actionTypeFactoryMapping);
    return factory.execute({ automationAction, automation });
  }

  static _doCreateAutomationAction(params) {
    return AutomationAction.save(params)
      .then(() => params);
  }
}
