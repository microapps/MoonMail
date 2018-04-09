import { parse } from 'aws-event-parser';
import { logger } from '../../lib/index';
import Events from '../../lib/events';
import AutomationsTriggerService from '../lib/automations_trigger_service';

export default function respond(event, cb) {
  logger().info('= automationsTrigger.action', JSON.stringify(event));
  const events = parse(event);
  logger().debug('Events:', JSON.stringify(events));
  const validEvents = events.filter(evt => Events.isValid(evt));
  logger().debug('Valid Events:', JSON.stringify(validEvents));
  return AutomationsTriggerService.execute(validEvents)
    .then(() => cb())
    .catch(() => cb());
}
