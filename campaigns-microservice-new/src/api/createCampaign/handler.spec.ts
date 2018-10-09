'use strict';

import { handlerService } from './handler';
import { CampaignRepository } from '../../types';
import * as decryptor from '../../lib/auth-token-decryptor';

describe('createCampaign', () => {
  let campaignService: CampaignRepository;
  let handler;

  beforeEach(() => {
    campaignService = {
      save: jest.fn(),
      edit: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    };
    handler = handlerService(campaignService);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should creates the campaign when the event is valid', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.returnValue({sub: 'my-user-id'});

    // WHEN
    const result = await handler({
      campaign: {
        senderId: 'ca654',
        segmentId: 'anotherId',
        subject: 'my campaign subject',
        listId: 'ca43546',
        name: 'my campaign',
        body: 'my campaign body',
        template: 'htmlBody',
        isUpToDate: true,
        sentAt: 0,
        createdAt: 0,
        scheduleAt: 0
      },
      authToken: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5UWTJSRGt4TVVJeE9FRTFNRFZET0Rnd05VWTVORUUxT0RSQk1qaEJSakkxTkVNd1FrSTBNdyJ9.eyJpc3MiOiJodHRwczovL21vb25tYWlsLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwODMyODMwMzkxNDA0Mzc2NTUxMyIsImF1ZCI6Inl4YUhSVm1BbFp2UFM5bXdTYnd6bXk5WTI0aDhtS2NWIiwiaWF0IjoxNTM4OTkwMjUzLCJleHAiOjE1Mzg5OTM4NTMsImF0X2hhc2giOiJEWGJHSE1OdHhZX0JOSkxDTGpKMWRRIiwibm9uY2UiOiJ5eGFIUlZtQWxadlBTOW13U2J3em15OVkyNGg4bUtjViJ9.zq-476NXJzwdOe_bzCEzIuh266TM-4oS18Xv_UHacHQ5GOyTWRBWkUToZGulDslEVBPgfDaqFEmolyrymMYQJ8cWqI561QIvUszjSvV9ENYzf72gSTnNYDX8RnvZIt6_3obDduByEBvUEdSSm6fZDh8yVx_BQeq_ItSNBP8pT4wmh1Glv9qqi9W9FifaegErGv8rdVMJL_jHhHnqIWxspxzkhMhbXKkL5q0XSnOv5kDFvHocuOvqjMUb488lS8L_PcHiovnDF0PzMPwc1mmOhVZGOuFvEtVCzHpZrw-ySc3KyGdX8ogfTZ4YRnxYGLriI8-hoDZVZk-pfFBnjobDKQ'
    });

    // THEN
    expect(result.userId).toBe('my-user-id');
    expect(result.status).toBe('draft');

    // AND
    expect(campaignService.save).toHaveBeenCalledWith({
      userId: 'my-user-id',
      senderId: 'ca654',
      segmentId: 'anotherId',
      subject: 'my campaign subject',
      listId: 'ca43546',
      name: 'my campaign',
      body: 'my campaign body',
      template: 'htmlBody',
      isUpToDate: true,
      status: 'draft',
      sentAt: 0,
      createdAt: 0,
      scheduleAt: 0
    });
    expect(decryptor.default).toHaveBeenCalledWith('Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5UWTJSRGt4TVVJeE9FRTFNRFZET0Rnd05VWTVORUUxT0RSQk1qaEJSakkxTkVNd1FrSTBNdyJ9.eyJpc3MiOiJodHRwczovL21vb25tYWlsLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwODMyODMwMzkxNDA0Mzc2NTUxMyIsImF1ZCI6Inl4YUhSVm1BbFp2UFM5bXdTYnd6bXk5WTI0aDhtS2NWIiwiaWF0IjoxNTM4OTkwMjUzLCJleHAiOjE1Mzg5OTM4NTMsImF0X2hhc2giOiJEWGJHSE1OdHhZX0JOSkxDTGpKMWRRIiwibm9uY2UiOiJ5eGFIUlZtQWxadlBTOW13U2J3em15OVkyNGg4bUtjViJ9.zq-476NXJzwdOe_bzCEzIuh266TM-4oS18Xv_UHacHQ5GOyTWRBWkUToZGulDslEVBPgfDaqFEmolyrymMYQJ8cWqI561QIvUszjSvV9ENYzf72gSTnNYDX8RnvZIt6_3obDduByEBvUEdSSm6fZDh8yVx_BQeq_ItSNBP8pT4wmh1Glv9qqi9W9FifaegErGv8rdVMJL_jHhHnqIWxspxzkhMhbXKkL5q0XSnOv5kDFvHocuOvqjMUb488lS8L_PcHiovnDF0PzMPwc1mmOhVZGOuFvEtVCzHpZrw-ySc3KyGdX8ogfTZ4YRnxYGLriI8-hoDZVZk-pfFBnjobDKQ');
  });

  it('should raise an error if the auth token is not passed', async () => {
    // GIVEN
    spyOn(decryptor, 'default').and.callThrough();

    // WHEN
    try {
      await handler({
        campaign: {
          senderId: 'ca654',
          subject: 'my campaign subject',
          listIds: 'ca43546',
          name: 'my campaign',
          body: 'my campaign body'
        },
        authToken: ''
      });
    } catch(error) {
      // THEN
      expect(error).toEqual({
        message: 'Access Denied',
        statusCode: 403
      });
    }
  });
});
