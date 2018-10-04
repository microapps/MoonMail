import * as jwt from 'jsonwebtoken';
import { TokenData } from '../types';

// import { GetUserAccountService } from './get-user-account-service';

function decrypt(authToken: string): TokenData {
  const cert = process.env.AUTH_PERMISSION;
  const tokenWithoutBearer = authToken.split(' ')[1];

  return jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] });
}

const decryptMock = (authToken: string): any => ({ sub: 'my-user-id', plan: 'gold' });

function getDecryptFn() {
  if (process.env.NODE_ENV === 'test') {
    return decryptMock;
  }
  return decrypt;
}

// const getUserContext = (userId) => GetUserAccountService.getAccount(userId);
// const getUserContextMock = () => ({ id: 'my-user-id', plan: 'gold' })


// function getUserContextFn() {
//   if (process.env.NODE_ENV === 'test') {
//     return getUserContextMock;
//   }
//   return getUserContext;
// }

export default getDecryptFn();
// const _getUserContext = getUserContextFn();
// export { _getUserContext as getUserContext };
