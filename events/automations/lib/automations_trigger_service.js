import Promise from 'bluebird';
import { AutomationAction } from 'moonmail-models';
import FootprintCalculator from '../../lib/footprint_calculator';
import AutomationActionDispatcherFactory from './AutomationActionDispatcherFactory';
import { logger } from '../../lib/index';

export default class AutomationsTriggerService {
  static execute(events = []) {
    logger().info('AutomationsTriggerService.execute', JSON.stringify(events));
    return Promise.resolve(events)
      .then(events => this._groupByFootprint(events))
      .then(eventsByFootprint => this._eventsByAutomationAction(eventsByFootprint))
      .then(eventsByAutomation => this._dispatchEvents(eventsByAutomation));
  }

  static _groupByFootprint(events = []) {
    return events.reduce((byFootprint, event) => {
      const footprint = FootprintCalculator.calculate(event, 'event');
      byFootprint[footprint] = byFootprint[footprint] ? byFootprint[footprint].concat(event) : [event];
      return byFootprint;
    }, {});
  }

  static _eventsByAutomationAction(footprintEvents) {
    logger().debug('_eventsByAutomationAction', JSON.stringify(footprintEvents));
    const footprints = Object.keys(footprintEvents);
    return Promise.reduce(
      footprints, (total, fp) =>
        AutomationAction.allByStatusAndFootprint('active', fp)
          .then(automations => automations.items || [])
          .then(automations => automations.map(automationAction => ({ automationAction, events: footprintEvents[fp] })))
          .then(automationEvents => total.concat(automationEvents))
          .catch(() => total)
      , []
    );
  }

  static _dispatchEvents(eventsAutomationActionPairs) {
    logger().debug('_scheduleEmails', JSON.stringify(eventsAutomationActionPairs));
    const dispatchers = eventsAutomationActionPairs.map(({ automationAction, events }) =>
      AutomationActionDispatcherFactory.build(automationAction, events));
    return Promise.map(dispatchers, dispatcher => dispatcher.dispatch().catch());
  }
}
