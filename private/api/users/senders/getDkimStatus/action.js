'use strict';

import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { GetDkimStatusService } from '../lib/get_dkim_status_service';

export function respond(event, cb) {
  debug('= getDkimStatus.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const senderId = event.senderId;
    if (senderId) {
      GetDkimStatusService.status(decoded.sub, senderId).then(data => {
        debug('= getDkimStatus.action', 'Success');
        return cb(null, data);
      })
      .catch(e => {
        debug('= getDkimStatus.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
