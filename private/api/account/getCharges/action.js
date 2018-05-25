
import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';
import Subscriptions from '../../../lib/subscriptions/index';

export function respond(event, cb) {
  debug('= getCharges.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    const params = event;
    return Subscriptions.getBillingHistory(decoded.sub, params)
      .then(userBillingHistory => cb(null, userBillingHistory))
      .catch(error => cb(ApiErrors.response(error)));
  }).catch(err => cb(ApiErrors.response(err), null));
}

