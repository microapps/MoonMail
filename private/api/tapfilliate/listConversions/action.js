import omitEmpty from 'omit-empty';
import listConversions from './listConversions';
import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';

export default function respond(event, cb) {
  debug('= listConversions', JSON.stringify(event));
  decrypt(event.authToken)
    .then(decoded => listConversions(decoded.sub, omitEmpty(event.options)))
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= listConversions', error, error.stack);
      cb(ApiErrors.response(error));
    });
}
