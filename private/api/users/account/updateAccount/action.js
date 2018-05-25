import { UpdateUserAccountService } from '../lib/update_user_account_service';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';

export function respond(event, cb) {
  debug('= updateAccount.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    UpdateUserAccountService.updateAccount(decoded.sub, { address: event.address, expertData: event.expertData, payPalEmail: event.payPalEmail, vat: event.vat, notifications: event.notifications })
      .then(userAccount => cb(null, userAccount))
      .catch(err => cb(ApiErrors.response(err)));
  })
    .catch(err => cb(ApiErrors.response(err), null));
}
