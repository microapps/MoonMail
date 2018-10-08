import campaignRepositoryFactory from './campaign';
import dynamoDB from '../lib/dynamo';
import { CampaignStatus } from '../types';
import * as validate from '../models/schema/validator';
import * as campaignSchemas from '../models/schema/campaign';

jest.mock('cuid', () => {
  return jest.fn(() => 'someId');
});

describe('Campaign Repository', () => {
  it('should fill the ID and save on the Database', () => {
    // GIVEN
    process.env.CAMPAIGN_TABLE = 'TableName';

    // AND
    spyOn(validate, 'default').and.returnValue({value: {
      id: 'someId',
      userId: 'userId',
      senderId: 'ca654',
      segmentId: 'anotherId',
      subject: 'my campaign subject',
      listId: 'ca43546',
      name: 'my campaign',
      body: 'my campaign body',
      status: CampaignStatus.DRAFT,
      template: 'htmlBody',
      isUpToDate: true,
      sentAt: 0,
      createdAt: 0,
      scheduleAt: 0
    }});
    spyOn(dynamoDB, 'put');
    spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});

    // WHEN
    campaignRepositoryFactory.save({
      userId: 'userId',
      senderId: 'ca654',
      segmentId: 'anotherId',
      subject: 'my campaign subject',
      listId: 'ca43546',
      name: 'my campaign',
      body: 'my campaign body',
      status: CampaignStatus.DRAFT,
      template: 'htmlBody',
      isUpToDate: true,
      sentAt: 0,
      createdAt: 0,
      scheduleAt: 0
    });

    // THEN
    expect(dynamoDB.put).toHaveBeenCalledWith({
      TableName: 'TableName',
      Item: {
        id: 'someId',
        userId: 'userId',
        senderId: 'ca654',
        segmentId: 'anotherId',
        subject: 'my campaign subject',
        listId: 'ca43546',
        name: 'my campaign',
        body: 'my campaign body',
        status: CampaignStatus.DRAFT,
        template: 'htmlBody',
        isUpToDate: true,
        sentAt: 0,
        createdAt: 0,
        scheduleAt: 0
      }
    })
  });

  it('should raise an error if the campaign is not valid', () => {
    // GIVEN
    spyOn(validate, 'default').and.returnValue({error: 'some error'});
    spyOn(dynamoDB, 'put');
    spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});

    // WHEN
    try {
      campaignRepositoryFactory.save({
        userId: 'userId',
        senderId: 'ca654',
        segmentId: 'anotherId',
        subject: 'my campaign subject',
        listId: 'ca43546',
        name: 'my campaign',
        body: 'my campaign body',
        status: CampaignStatus.DRAFT,
        template: 'htmlBody',
        isUpToDate: true,
        sentAt: 0,
        createdAt: 0,
        scheduleAt: 0
      });
    } catch (error) {
      // THEN
      expect(validate.default).toHaveBeenCalledWith(
        {
          id: 'someId',
          userId: 'userId',
          senderId: 'ca654',
          segmentId: 'anotherId',
          subject: 'my campaign subject',
          listId: 'ca43546',
          name: 'my campaign',
          body: 'my campaign body',
          status: CampaignStatus.DRAFT,
          template: 'htmlBody',
          isUpToDate: true,
          sentAt: 0,
          createdAt: 0,
          scheduleAt: 0
        },
        {joiSchema: 'campaign'}
      );
      expect(error.message).toBe('Validation error: some error');

      // AND
      expect(dynamoDB.put).not.toHaveBeenCalled();
    }
  });
});
