import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { GetUserAccountService } from './get_user_account_service';
const cert = fs.readFileSync('lib/certs/auth.pem');

export default function decrypt(authToken) {
  return new Promise((resolve, reject) => {
    const tokenWithoutBearer = authToken.split(' ')[1];
    jwt.verify(tokenWithoutBearer, cert, {algorithms: ['RS256']}, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(Object.assign({}, decoded, decoded.app_metadata));
      }
    });
  });
}

export function getUserContext(userId) {
  return GetUserAccountService.getAccount(userId);
}
