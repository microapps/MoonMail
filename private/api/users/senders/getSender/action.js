import Promise from 'bluebird';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { User } from '../../../../lib/models/user';
import { SenderDecoratorService } from '../lib/sender_decorator_service';

export function respond(event, cb) {
  debug('= getSender.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    const senderId = event.senderId;
    const userId = decoded.sub;
    if (senderId) {
      User.fetchSender(userId, senderId, true, false)
        .then(sender => SenderDecoratorService.getStatuses(userId, sender))
        .then(decoretedSender => cb(null, decoretedSender))
        .catch((e) => {
          debug('= getSender.action', e);
          return cb(ApiErrors.response(e));
        });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
