'use strict';

import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { GenerateDkimTokensService } from '../lib/generate_dkim_tokens_service';

export function respond(event, cb) {
  debug('= generateDkim.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const senderId = event.senderId;
    if (senderId) {
      GenerateDkimTokensService.generate(decoded.sub, senderId).then(data => {
        debug('= generateDkim.action', 'Success');
        return cb(null, { dkimTokens: data.DkimTokens });
      })
      .catch(e => {
        debug('= generateDkim.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
