import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { GetUserAccountService } from '../api/users/account/lib/get_user_account_service';
import errors from '../api/lib/errors';

export default function decrypt(authToken) {
  const cert = fs.readFileSync('lib/certs/auth.pem');
  return new Promise((resolve, reject) => {
    const tokenWithoutBearer = authToken.split(' ')[1];
    jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(errors.InvalidToken);
      } else {
        resolve(Object.assign({}, decoded, decoded.app_metadata));
      }
    });
  });
}

export function getUserContext(userId) {
  return GetUserAccountService.getAccount(userId);
}
