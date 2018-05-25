import handleDeletedSubscription from './handleDeletedSubscription';
import { debug } from '../../../lib/index';

export default function respond(event, cb) {
  debug('= handleStripeAutoUnsubscribe', JSON.stringify(event));
  handleDeletedSubscription(event)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= handleStripeAutoUnsubscribe', error, error.stack);
      cb(error);
    });
}
