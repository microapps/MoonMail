import handler from './delete';
import campaignRepository from '../repositories/campaign';
import * as decryptor from '../lib/auth-token-decryptor';
import ApiErrors from '../lib/errors';

describe('Delete Campaign', () => {
  fit('should delete the campaign', () => {
    // GIVEN
    spyOn(campaignRepository, 'delete');
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});

    // WHEN
    handler(<any>{
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

  it('should return an error when something the Authorization header is not provided', () => {
    // GIVEN
    spyOn(ApiErrors, 'response').and.returnValue({
      message: 'Missing or invalid JWT',
      status: 401
    });
    spyOn(decryptor, 'default').and.callFake(() => {
      throw {
        message: 'Access Denied',
        statusCode: 403
      }
    });
    spyOn(campaignRepository, 'delete');

    // WHEN
    const result = handler(<any>{
      pathParameters: { id: 'someId' },
      headers: {
        Authorization: undefined
      }
    });

    // THEN
    expect(result).toEqual({
      message: 'Access Denied',
      statusCode: 403
    });

    // AND
    expect(decryptor.default).toBeCalledWith(undefined);

    // AND
    expect(ApiErrors.response).toBeCalledWith({
      message: 'Access Denied',
      statusCode: 403
    });

    // AND
    expect(campaignRepository.delete).not.toBeCalled();
  });

  it('should return an error when something the Authorization header is not provided', () => {
    // GIVEN
    spyOn(ApiErrors, 'response').and.returnValue({
      message: 'Missing or invalid JWT',
      status: 401
    });
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});
    spyOn(campaignRepository, 'delete').and.returnValue(Promise.reject({
      name: 'AWSError',
      message: 'Something goes wrong with the deletion',
      statusCode: 500
    }));

    // WHEN
    const result = handler(<any>{
      pathParameters: { id: 'someId' },
      headers: {
        Authorization: undefined
      }
    });

    // THEN
    expect(result).toEqual({
      message: 'Something goes wrong with the deletion',
      statusCode: 500
    });

    // AND
    expect(decryptor.default).toBeCalledWith(undefined);

    // AND
    expect(ApiErrors.response).toBeCalledWith({
      name: 'AWSError',
      message: 'Something goes wrong with the deletion',
      statusCode: 500
    });

    // AND
    expect(campaignRepository.delete).toBeCalledWith('my-user-id', 'someId');
  });
});