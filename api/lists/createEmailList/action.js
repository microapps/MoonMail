

import { List } from 'moonmail-models';
import { debug } from '../../lib/logger';
import cuid from 'cuid';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';

export function respond(event, cb) {
  debug('= createEmailList.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    if(decoded.sub === 'google-oauth2|113947278021199221588') throw 'Sorry, the demo account is not allowed to perform this action' //demo account
    if (event.list) {
      const list = event.list;
      list.userId = decoded.sub;
      list.id = cuid();
      list.isDeleted = false.toString();
      list.importStatus = {};
      isValid(list)
        .then(list => List.save(list))
        .then(() => cb(null, list))
        .catch((e) => {
          debug(e);
          return cb(ApiErrors.response(e));
        });
    } else {
      return cb(ApiErrors.response('No list specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}

function isValid(list) {
  return List.isValid(list) ? Promise.resolve(list) : Promise.reject(new Error('Required attributes are missing'));
}
