import * as jwt from 'jsonwebtoken';
import { TokenData } from '../types';
import ApiErrors from './errors';

// import { GetUserAccountService } from './get-user-account-service';

export default function decrypt(authToken: string): TokenData {
  if (!authToken) {
    throw ApiErrors.errors.accessDenied; // It'll be moved to Authentication lambda
  }

  const cert = process.env.AUTH_PERMISSION;
  const tokenWithoutBearer = authToken.split(' ')[1];

  return jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] });
}

// const getUserContext = (userId) => GetUserAccountService.getAccount(userId);
// const getUserContextMock = () => ({ id: 'my-user-id', plan: 'gold' })


// function getUserContextFn() {
//   if (process.env.NODE_ENV === 'test') {
//     return getUserContextMock;
//   }
//   return getUserContext;
// }

// const _getUserContext = getUserContextFn();
// export { _getUserContext as getUserContext };
