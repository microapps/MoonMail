import attachPayoutMethod from './attachPayoutMethod';
import { debug } from '../../../lib/index';

export default function respond(event, cb) {
  debug('= attachPayoutMethod', JSON.stringify(event));
  attachPayoutMethod(event)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= attachPayoutMethod', error, error.stack);
      cb(error);
    });
}
