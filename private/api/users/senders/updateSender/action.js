import omitEmpty from 'omit-empty';
import decrypt from '../../../../lib/auth-token-decryptor';
import { User } from '../../../../lib/models/user';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  decrypt(event.authToken).then(decoded => {
    if (event.senderId) {
      User.updateSender(decoded.sub, omitEmpty({id: event.senderId, fromName: event.fromName, archived: event.archived}))
        .then(newSender => cb(null, newSender))
        .catch(err => cb(ApiErrors.response(err)));
    } else {
      return cb(ApiErrors.response('Missing params'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
