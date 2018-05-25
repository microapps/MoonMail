import handleConversions from './handleConversions';
import { debug } from '../../../lib/index';

export default function respond(event, cb) {
  debug('= handleConversions', JSON.stringify(event));
  handleConversions(event)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= handleConversions', error, error.stack);
      cb(error);
    });
}
