'use strict';

import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { GenerateDomainVerificationTokensService } from '../lib/generate_domain_verification_tokens_service';

export function respond(event, cb) {
  debug('= verifyDomain.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const senderId = event.senderId;
    if (senderId) {
      GenerateDomainVerificationTokensService.generate(decoded.sub, senderId).then(data => {
        debug('= verifyDomain.action', 'Success');
        return cb(null, { domainVerificationToken: data.VerificationToken });
      }).catch(e => {
        debug('= verifyDomain.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
