import jwt from 'jsonwebtoken';
import {TokenData} from '../types';
import {BadRequest, Unauthorized} from 'http-errors';

export default function decrypt(authToken: string): TokenData {
  if (!authToken) {
    throw new Unauthorized('Missing or invalid JWT'); // It'll be moved to Authentication lambda
  }

  const cert = process.env.AUTH_PERMISSION;
  const tokenWithoutBearer = authToken.split(' ')[1];
  try {
    return jwt.verify(tokenWithoutBearer, cert, { algorithms: ['RS256'] });
  } catch (error) {
    const badRequestError = new Unauthorized(error.message);
    badRequestError.stack = error.stack || '';
    throw badRequestError;
  }
}
