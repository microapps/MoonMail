import decryptor from './auth-token-decryptor';
import jwt from 'jsonwebtoken';
import {Unauthorized} from 'http-errors';

describe('Decryptor', () => {
  beforeEach(() => {
    
  });

  it('should decrypt the given token using jwt.verify', () => {
    // GIVEN
    process.env.AUTH_PERMISSION = 'certificate loaded by serverless';

    // AND
    spyOn(jwt, 'verify').and.returnValue({
      at_hash: 'DXbGHMNtxY_BNJLCLjJ1dQ',
      aud: 'yxaHRVmAlZvPS9mwSbwzmy9Y24h8mKcV',
      exp: 1538993853,
      iat: 1538990253,
      iss: 'https://moonmail.auth0.com/',
      nonce: 'yxaHRVmAlZvPS9mwSbwzmy9Y24h8mKcV',
      sub: 'user-id'
    });

    // WHEN
    decryptor('Bearer any.token.value');

    // THEN
    expect(jwt.verify).toHaveBeenCalledWith('any.token.value', 'certificate loaded by serverless', { algorithms: ['RS256'] });
  });

  it('should throw and error when the token is not provided (empty string)', () => {
    // GIVEN
    spyOn(jwt, 'verify');

    // WHEN
    try {
      decryptor('');
    } catch (error) {
      expect(error instanceof Unauthorized).toBe(true)
      expect(error.message).toBe('Missing or invalid JWT');
    }

    // THEN
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('should throw and error when the token is not provided (undefined)', () => {
    // GIVEN
    spyOn(jwt, 'verify');

    // WHEN
    try {
      decryptor(undefined);
    } catch (error) {
      expect(error instanceof Unauthorized).toBe(true)
      expect(error.message).toBe('Missing or invalid JWT');
    }

    // THEN
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});