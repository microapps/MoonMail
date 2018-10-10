import * as jwt from 'jsonwebtoken';
import { TokenData } from '../types';
import ApiErrors from './errors';

export default function decrypt(authToken: string): TokenData {
  if (!authToken) {
    throw ApiErrors.errors.accessDenied; // It'll be moved to Authentication lambda
  }

  const cert = process.env.AUTH_PERMISSION;
  const tokenWithoutBearer = authToken.split(' ')[1];

  return jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] });
}
