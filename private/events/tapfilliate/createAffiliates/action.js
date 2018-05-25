import createAffiliates from './createAffiliates';
import { debug } from '../../../lib/index';

export default function respond(event, cb) {
  debug('= createAffiliates', JSON.stringify(event));
  createAffiliates(event)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= createAffiliates', error, error.stack);
      cb(error);
    });
}
