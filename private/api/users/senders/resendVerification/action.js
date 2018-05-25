'use strict';

import { EmailVerifierService } from '../lib/email_verifier_service';
import { debug } from '../../../../lib/index';
import { User } from '../../../../lib/models/user';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  debug('= resendVerification.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    if (event.senderId) {
      User.fetchSender(decoded.sub, event.senderId, true)
        .then(sender => {
          const service = EmailVerifierService.create(sender.emailAddress, {userId: decoded.sub});
          service.verify()
            .then(() => cb(null, true))
            .catch(err => cb(ApiErrors.response(err)))
        })
        .catch(err => cb(ApiErrors.response(err)));
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
