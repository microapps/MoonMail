'use strict';

import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { EnableDkimService } from '../lib/enable_dkim_service';

export function respond(event, cb) {
  debug('= activateDkim.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const senderId = event.senderId;
    if (senderId) {
      EnableDkimService.enable(decoded.sub, senderId).then(data => {
        debug('= activateDkim.action', 'Success');
        return cb(null, data);
      })
      .catch(e => {
        debug('= activateDkim.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
