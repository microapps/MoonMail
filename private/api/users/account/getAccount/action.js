import { GetUserAccountService } from '../lib/get_user_account_service';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import ReputationControls from '../../../../lib/reputation/index';

export function respond(event, cb) {
  debug('= getAccount.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    const userId = decoded.sub;
    return ReputationControls.performAndUpdate(userId)
      .then(() => GetUserAccountService.getAccount(userId))
      .then(userAccount => cb(null, userAccount))
      .catch(err => cb(ApiErrors.response(err)));
  }).catch(err => cb(ApiErrors.response(err), null));
}
