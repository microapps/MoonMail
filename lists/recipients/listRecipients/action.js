import omitEmpty from 'omit-empty';
import { logger } from '../../lib/index';
import Recipients from '../../lib/recipients/index';

export default function respond(event, cb) {
  logger().info('= searchRecipients.action', JSON.stringify(event));
  const options = event.options || {};
  const queryParams = { listId: event.listId, q: event.options.q, status: event.options.status };
  return Recipients.listRecipients(omitEmpty(queryParams), omitEmpty(event.pagination))
    .then(recipients => cb(null, recipients))
    .catch((err) => {
      logger().error(err, err);
      return cb(JSON.stringify(err));
    });
}
