'use strict';

import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';
import { SetSesCredentialsService } from '../lib/set_ses_credentials_service';

export function respond(event, cb) {
  debug('= setSesCredentials.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const credentials = event.ses;
    if (credentials.apiKey && credentials.apiSecret && credentials.region) {
      SetSesCredentialsService.run(decoded.sub, credentials).then(user => {
        debug('= setSesCredentials.action', 'Success');
        // const ses = user.ses || {};
        // const response = {apiKey: ses.apiKey, sendingQuota: ses.sendingQuota, region: ses.region};
        return cb(null, user);
      })
      .catch(e => {
        debug('= setSesCredentials.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No credentials specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
