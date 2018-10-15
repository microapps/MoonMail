import {Unauthorized} from 'http-errors';

import {action} from './delete';
import campaignRepository from '../repositories/campaign';
import * as decryptor from '../lib/auth-token-decryptor';

describe('Delete Campaign', () => {
  it('should delete the campaign', () => {
    // GIVEN
    spyOn(campaignRepository, 'delete');
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});

    // WHEN
    action(<any>{
      pathParameters: { id: 'someId' },
      headers: {
        Authorization: 'Bearer json.web.token'
      }
    });

    // THEN
    expect(decryptor.default).toBeCalledWith('Bearer json.web.token');
    
    // AND
    expect(campaignRepository.delete).toBeCalledWith('my-user-id', 'someId');
  });

  it('should return an error when something the Authorization header is not provided', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.callFake(() => {
      throw new Unauthorized('Missing or invalid JWT');
    });
    spyOn(campaignRepository, 'delete');

    // WHEN
    try {
      await action(<any>{
        pathParameters: { id: 'someId' },
        headers: {
          Authorization: undefined
        }
      });
    } catch (error) {
      // THEN
      expect(error instanceof Unauthorized).toBe(true);
      expect(error.message).toEqual('Missing or invalid JWT');
  
      // AND
      expect(decryptor.default).toBeCalledWith(undefined);
  
      // AND
      expect(campaignRepository.delete).not.toBeCalled();
    }
  });

  it('should return an error when something goes wrong on AWS API', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});
    spyOn(campaignRepository, 'delete').and.returnValue(Promise.reject({
      name: 'AWSError',
      message: 'Something goes wrong with the deletion',
      statusCode: 500
    }));

    // WHEN
    try {
      await action(<any>{
        pathParameters: { id: 'someId' },
        headers: {
          Authorization: 'Bearer json.web.token'
        }
      });
    } catch (error) {
      // THEN
      expect(error).toEqual({
        name: 'AWSError',
        message: 'Something goes wrong with the deletion',
        statusCode: 500
      });
  
      // AND
      expect(decryptor.default).toBeCalledWith('Bearer json.web.token');

      // AND
      expect(campaignRepository.delete).toBeCalledWith('my-user-id', 'someId');
    }
  });
});