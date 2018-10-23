'use strict';

import { List } from 'moonmail-models';
import { debug } from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';

export function respond(event, cb) {
  debug('= updateEmailList.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    if(decoded.sub === 'google-oauth2|113947278021199221588') throw 'Sorry, the demo account is not allowed to perform this action' //demo account
    if (event.list && event.listId) {
      List.update(event.list, decoded.sub, event.listId).then(list => {
        debug('= updateEmailList.action', 'Success');
        return cb(null, list);
      })
      .catch(e => {
        debug('= updateEmailList.action', e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No list specified'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
