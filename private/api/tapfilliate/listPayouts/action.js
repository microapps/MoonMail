import omitEmpty from 'omit-empty';
import listPayouts from './listPayouts';
import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';

export default function respond(event, cb) {
  debug('= listPaypouts', JSON.stringify(event));
  decrypt(event.authToken)
    .then(decoded => listPayouts(decoded.sub, omitEmpty(event.options)))
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= listPaypouts', error, error.stack);
      cb(ApiErrors.response(error));
    });
}
