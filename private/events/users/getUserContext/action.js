import { logger } from '../../../lib/index';
import { User } from '../../../lib/models/user';

export default function respond(event, cb) {
  logger().info('= getUserContext.action', JSON.stringify(event));
  return (event.apiKey ? User.findByApiKey(event.apiKey) : User.get(event.userId))
    .then(data => cb(null, data))
    .catch(err => cb(err));
}
