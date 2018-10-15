import {BadRequest} from 'http-errors';

import campaignRepository from './campaign';
import dynamoDB from './dynamo';
import { CampaignStatus } from '../types';
import * as validate from '../models/schema/validator';
import * as campaignSchemas from '../models/schema/campaign';

jest.mock('cuid', () => {
  return jest.fn(() => 'someId');
});

describe('Campaign Repository', () => {
  describe('Save', () => {
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
        }
      });
      spyOn(dynamoDB, 'put');
      spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});

      // WHEN
      campaignRepository.save({
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
      expect(dynamoDB.put).toBeCalledWith({
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
      });

      // AND
      expect(validate.default).toBeCalledWith(
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
    });
  
    it('should raise an error if the campaign is not valid', () => {
      // GIVEN
      spyOn(validate, 'default').and.returnValue({error: new Error('Some error')});

      // AND
      spyOn(dynamoDB, 'put');
      spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});
  
      // WHEN
      try {
        campaignRepository.save({
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
        expect(error instanceof BadRequest).toBe(true);
        expect(error.message).toBe('Some error');

        // AND
        expect(validate.default).toBeCalledWith(
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
  
        // AND
        expect(dynamoDB.put).not.toHaveBeenCalled();
      }
    });
  });

  describe('Delete', () => {
    it('should delete the campaign', async () => {
      // GIVEN
      spyOn(dynamoDB, 'delete').and.returnValue(true);

      // WHEN
      const result = await campaignRepository.delete('my-user-id', 'someId');

      // THEN
      expect(result).toBe(true);

      // AND
      expect(dynamoDB.delete).toBeCalledWith('my-user-id', 'someId');
    });

    it('should raise any error throwed', async () => {
      // GIVEN
      spyOn(dynamoDB, 'delete').and.callFake(() => {throw new Error('ops')});

      // WHEN
      try {
        await campaignRepository.delete('my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(error.message).toBe('ops');
  
        // AND
        expect(dynamoDB.delete).toBeCalledWith('my-user-id', 'someId');
      }
    });
  });

  describe('Update', () => {
    it('should update the campaign', () => {
      // GIVEN
      process.env.CAMPAIGN_TABLE = 'TableName';

      // AND
      spyOn(validate, 'default').and.returnValue({
        value: {
          id: 'someId',
          userId: 'userId',
          senderId: 'ca654',
          segmentId: '',
          subject: null,
          listId: '',
          name: 'my campaign',
          body: 'my campaign body',
          status: CampaignStatus.DRAFT,
          template: 'htmlBody',
          isUpToDate: true,
          sentAt: 0,
          createdAt: 0,
          scheduleAt: 0
        }
      });

      // AND
      spyOn(dynamoDB, 'update');
      spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});

      // WHEN
      campaignRepository.update({
        id: 'someId',
        userId: 'userId',
        senderId: 'ca654',
        segmentId: '',
        subject: null,
        listId: '',
        name: 'my campaign',
        body: 'my campaign body',
        status: CampaignStatus.DRAFT,
        template: 'htmlBody',
        isUpToDate: true,
        sentAt: 0,
        createdAt: 0,
        scheduleAt: 0
      }, 'my-user-id', 'someId');

      // THEN
      expect(dynamoDB.update).toBeCalledWith({
        id: 'someId',
        userId: 'userId',
        senderId: 'ca654',
        segmentId: '',
        subject: null,
        listId: '',
        name: 'my campaign',
        body: 'my campaign body',
        status: CampaignStatus.DRAFT,
        template: 'htmlBody',
        isUpToDate: true,
        sentAt: 0,
        createdAt: 0,
        scheduleAt: 0
      }, 'my-user-id', 'someId');

      // AND
      expect(validate.default).toBeCalledWith(
        {
          id: 'someId',
          userId: 'userId',
          senderId: 'ca654',
          segmentId: '',
          subject: null,
          listId: '',
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
    });

    it('should raise an error if the campaign is not valid', () => {
      // GIVEN
      spyOn(validate, 'default').and.returnValue({error: new Error('Some error')});

      // AND
      spyOn(dynamoDB, 'put');
      spyOn(campaignSchemas, 'schema').and.returnValue({joiSchema: 'campaign'});

      // WHEN
      try {
        campaignRepository.save({
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
        expect(validate.default).toBeCalledWith(
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
        expect(error.message).toBe('Some error');
  
        // AND
        expect(dynamoDB.put).not.toHaveBeenCalled();
      }
    });
  });
});
