'use strict';

import { CheckSenderStatusService } from '../lib/check_sender_status_service';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  debug('= checkVerificationStatus.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    if (event.senderId) {
      const service = new CheckSenderStatusService(decoded.sub, event.senderId);
      service.checkSender()
        .then(sender => cb(null, sender))
        .catch(err => cb(ApiErrors.response(err)));
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
