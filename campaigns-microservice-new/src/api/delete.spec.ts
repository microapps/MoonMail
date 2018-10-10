import handler from './delete';
import campaignRepository from '../repositories/campaign';
import * as decryptor from '../lib/auth-token-decryptor';
import ApiErrors from '../lib/errors';

describe('Delete Campaign', () => {
  it('should delete the campaign', () => {
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

  it('should return an error when something the Authorization header is not provided', async () => {
    // GIVEN
    spyOn(ApiErrors, 'response').and.returnValue({
      body: '{"message": "Access Denied"}',
      statusCode: 403
    });
    spyOn(decryptor, 'default').and.callFake(() => {
      throw {
        message: 'Access Denied',
        statusCode: 403
      }
    });
    spyOn(campaignRepository, 'delete');

    // WHEN
    const result = await handler(<any>{
      pathParameters: { id: 'someId' },
      headers: {
        Authorization: undefined
      }
    });

    // THEN
    expect(result).toEqual({
      body: '{"message": "Access Denied"}',
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

  it('should return an error when something goes wrong on AWS API', async () => {
    // GIVEN
    spyOn(ApiErrors, 'response').and.returnValue({
      name: 'AWSError',
      body: '{"message": "Something goes wrong with the deletion"}',
      statusCode: 500
    });
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});
    spyOn(campaignRepository, 'delete').and.returnValue(Promise.reject({
      name: 'AWSError',
      message: 'Something goes wrong with the deletion',
      statusCode: 500
    }));

    // WHEN
    const result = await handler(<any>{
      pathParameters: { id: 'someId' },
      headers: {
        Authorization: 'Bearer json.web.token'
      }
    });

    // THEN
    expect(result).toEqual({
      name: 'AWSError',
      body: '{"message": "Something goes wrong with the deletion"}',
      statusCode: 500
    });

    // AND
    expect(decryptor.default).toBeCalledWith('Bearer json.web.token');

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