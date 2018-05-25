import processStripeWebhook from './processStripeWebhook';
import { debug } from '../../../lib/index';
import { ApiErrors } from '../../../lib/errors';

export default function respond(event, cb) {
  debug('= processStripeWebhook', JSON.stringify(event));
  processStripeWebhook(event.payload)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= processStripeWebhook', error, error.stack);
      cb(ApiErrors.response(error));
    });
}
