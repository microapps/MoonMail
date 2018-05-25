
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { GetUserAccountService } from './get_user_account_service';

const decrypt = function decrypt(authToken) {
  const cert = fs.readFileSync('lib/certs/auth.pem');
  return new Promise((resolve, reject) => {
    const tokenWithoutBearer = authToken.split(' ')[1];
    jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(Object.assign({}, decoded, decoded.app_metadata));
      }
    });
  });
};

const getUserContext = function getUserContext(userId) {
  return GetUserAccountService.getAccount(userId);
};

const decryptMock = function decryptMock(authToken) {
  return new Promise((resolve) => {
    resolve({ sub: 'my-user-id', plan: 'gold' });
  });
};

const getUserContextMock = function getUserContextMock(userId) {
  return new Promise((resolve) => {
    resolve({ id: 'my-user-id', plan: 'gold' });
  });
};

function getDecryptFn() {
  if (process.env.NODE_ENV === 'test') {
    return decryptMock;
  }
  return decrypt;
}

function getUserContextFn() {
  if (process.env.NODE_ENV === 'test') {
    return getUserContextMock;
  }
  return getUserContext;
}

export default getDecryptFn();
const _getUserContext = getUserContextFn();
export { _getUserContext as getUserContext };
