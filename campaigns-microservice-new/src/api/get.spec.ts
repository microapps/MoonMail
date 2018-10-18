import {Unauthorized} from 'http-errors';

import { action } from './get';
import * as decryptor from '../lib/auth-token-decryptor';
import campaignRepository from '../repositories/campaign';

describe('Get campaign', () => {
  it('should retrieve one campaign', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});

    // AND
    spyOn(campaignRepository, 'get').and.returnValue({
      userId: 'my-user-id',
      subject: 'My first MoonMail Campaign - Ecommerce Template',
      id: 'someId',
      listId: 'cjmqohexu000001qpth88489'
    });

    // WHEN
    const result = await action(<any>{
      pathParameters: {
        id: 'someId',
      },
      headers: {
        Authorization: 'Bearer some.jwt.token'
      }
    });

    // THEN
    expect(result).toEqual({
      userId: 'my-user-id',
      subject: 'My first MoonMail Campaign - Ecommerce Template',
      id: 'someId',
      listId: 'cjmqohexu000001qpth88489'
    });

    // AND
    expect(decryptor.default).toBeCalledWith('Bearer some.jwt.token');

    // AND
    expect(campaignRepository.get).toBeCalledWith('my-user-id', 'someId');
  });

  it('should raise any error throwed by decryptor', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.callFake(() => {
      throw new Unauthorized('Missing or invalid JWT')
    });

    // AND
    spyOn(campaignRepository, 'get');

    // WHEN
    try {
      await action(<any>{
        pathParameters: {
          id: 'someId',
        },
        headers: {
          Authorization: 'Bearer an.invalid.token'
        }
      });
    } catch (error) {
      // THEN
      expect(error instanceof Unauthorized).toBe(true);
      expect(error.message).toBe('Missing or invalid JWT');
    }

    // AND
    expect(decryptor.default).toBeCalledWith('Bearer an.invalid.token');

    // AND
    expect(campaignRepository.get).not.toBeCalled();
  });
});