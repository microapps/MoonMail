import decrypt from '../../../../lib/auth-token-decryptor';
import { User } from '../../../../lib/models/user';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  decrypt(event.authToken).then(decoded => {
    if (event.senderId) {
      User.deleteSender(decoded.sub, event.senderId)
        .then(senders => cb(null, senders))
        .catch(err => cb(ApiErrors.response(err)));
    } else {
      return cb(ApiErrors.response('Missing params'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
