'use strict';

import { CreateSenderService } from '../lib/create_sender_service';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  debug('= createSender.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    if (event.email) {
      const service = new CreateSenderService(event.email, decoded.sub, event.fromName);
      service.createSender()
        .then(newSender => cb(null, newSender))
        .catch(err => cb(ApiErrors.response(err)));
    } else {
      return cb(ApiErrors.response('No email specified'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
