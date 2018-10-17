import * as decryptor from '../lib/auth-token-decryptor';
import campaign from '../repositories/campaign';
import { action } from './list';

fdescribe('List Campaign', () => {
  it('should retrieve the list with archived', () => {
    // GIVEN
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});
    spyOn(campaign, 'list').and.returnValue([
      {
        id: 'someId',
        body: 'It must return that this method returns',
        archived: true
      }
    ]);

    // WHEN
    action(<any>{
      queryStringParameters: {
        page: 1,
        limit: 5,
        fields: ['id', 'body'],
        archived: true
      },
      headers: {
        Authorization: 'Bearer some.jwt.token'
      }
    });

    // THEN
    expect(decryptor.default).toBeCalledWith('Bearer some.jwt.token');
    
    // AND
    expect(campaign.list).toBeCalledWith('my-user-id', {
      page: 1,
      limit: 5,
      fields: ['id', 'body'],
      filters: {archived: {eq: true}}
    });
  });

  it('should retrieve the list without archived', () => {
    // GIVEN
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});
    spyOn(campaign, 'list').and.returnValue([
      {
        id: 'someId',
        body: 'It must return that this method returns'
      }
    ]);

    // WHEN
    action(<any>{
      queryStringParameters: {
        page: 1,
        limit: 5,
        fields: ['id', 'body'],
        archived: false
      },
      headers: {
        Authorization: 'Bearer some.jwt.token'
      }
    });

    // THEN
    expect(decryptor.default).toBeCalledWith('Bearer some.jwt.token');
    
    // AND
    expect(campaign.list).toBeCalledWith('my-user-id', {
      page: 1,
      limit: 5,
      fields: ['id', 'body'],
      filters: {archived: {ne: true}}
    });
  });
});