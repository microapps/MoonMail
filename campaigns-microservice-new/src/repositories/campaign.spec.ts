import {BadRequest} from 'http-errors';

import campaignRepository from './campaign';
import {CampaignStatus} from '../types';
import {Campaign as campaignSchema} from '../models/schema/campaign';
import { not } from 'joi';

describe('Campaign Repository', () => {
  describe('Save', () => {
    it('should fill the ID and save on the Database', () => {
     // GIVEN
      spyOn(campaignSchema, 'create').and.callFake((campaign, callback) => callback(null, {
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
      }));

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
      expect(campaignSchema.create).toBeCalledWith(
        {
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
        expect.any(Function)
      );
    });
  
    it('should raise an error if the campaign is not valid', async () => {
      // GIVEN
      spyOn(campaignSchema, 'create').and.callFake(((campaign, callback) => callback(new Error('Some error'))));
  
      // WHEN
      try {
        await campaignRepository.save({
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
        expect(campaignSchema.create).toBeCalledWith(
          {
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
          expect.any(Function)
        );
      }
    });
  });

  describe('Delete', () => {
    it('should delete the campaign', async () => {
      // GIVEN
      spyOn(campaignSchema, 'destroy').and.callFake((userId, id, callback) => callback(null, true));

      // WHEN
      const result = await campaignRepository.delete('my-user-id', 'someId');

      // THEN
      expect(result).toBe(true);

      // AND
      expect(campaignSchema.destroy).toBeCalledWith('my-user-id', 'someId', expect.any(Function));
    });

    it('should raise any error throwed', async () => {
      // GIVEN
      spyOn(campaignSchema, 'destroy').and.callFake((userId, id, callback) => callback(new Error('Some error')));

      // WHEN
      try {
        await campaignRepository.delete('my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(error.message).toBe('Some error');
  
        // AND
        expect(campaignSchema.destroy).toBeCalledWith('my-user-id', 'someId', expect.any(Function));
      }
    });
  });

  describe('Update', () => {
    it('should update the campaign', async () => {
      // GIVEN
      spyOn(campaignSchema, 'update').and.callFake((campaign, callback) => callback(null, {
        id: 'someId',
        userId: 'my-user-id',
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
      }));

      // WHEN
      await campaignRepository.update({
        id: 'someId',
        userId: 'my-user-id',
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
      expect(campaignSchema.update).toBeCalledWith(
        {
          id: 'someId',
          userId: 'my-user-id',
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
        expect.any(Function)
      );
    });

    it('should raise an error if the campaign is not valid', async () => {
      // GIVEN
      spyOn(campaignSchema, 'update').and.callFake((campaign, callback) => callback(new Error('Some error')));

      // WHEN
      try {
        await campaignRepository.update({
          id: 'someId',
          userId: 'my-user-id',
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
        }, 'my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(error instanceof BadRequest).toBe(true);
        expect(error.message).toBe('Some error');
  
        // AND
        expect(campaignSchema.update).toBeCalledWith(
          {
            id: 'someId',
            userId: 'my-user-id',
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
          expect.any(Function)
        );
      }
    });

    it('should raise an error if the userId is different from the campaign', async () => {
      // GIVEN
      spyOn(campaignSchema, 'update');

      // WHEN
      try {
        await campaignRepository.update({
          id: 'someId',
          userId: 'a-different-user-id',
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
        }, 'my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(error instanceof BadRequest).toBe(true);
        expect(error.message).toBe('Data does not match');
  
        // AND
        expect(campaignSchema.update).not.toBeCalled();
      }
    });

    it('should raise an error if the userId is different from the campaign', async () => {
      // GIVEN
      spyOn(campaignSchema, 'update');

      // WHEN
      try {
        await campaignRepository.update({
          id: 'a-different-id',
          userId: 'my-user-id',
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
        }, 'my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(error instanceof BadRequest).toBe(true);
        expect(error.message).toBe('Data does not match');
  
        // AND
        expect(campaignSchema.update).not.toBeCalled();
      }
    });
  });

  describe('List', () => {
    let query;
    let limit;
    let attributes;
    let startKey
    let exec;
    beforeEach(() => {
      limit = jest.fn();
      attributes = jest.fn();
      startKey = jest.fn();
      exec = jest.fn();
      query = {
        limit, attributes, startKey, exec
      };
      limit.mockImplementation(() => query);
      attributes.mockImplementation(() => query);
      startKey.mockImplementation(() => query);
    });

    it('should list the first page of campaigns when requesting the page 0', async () => {
      // GIVEN
      exec.mockImplementation(callback => callback(null, {
        Items: [
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnanxzk7000001pa61qk54l8',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkm7d000001qseupu1pv3',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnko74000101qs7cz8d75e',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkp8r000201qsh44ut6q5',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnl0p2000301qsvg0r75eb',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            }
        ],
        Count: 5,
        ScannedCount: 5,
        LastEvaluatedKey: {
            id: 'cjnbnl0p2000301qsvg0r75eb',
            userId: 'my-user-id'
        }
      }));

      // AND
      spyOn(campaignSchema, 'query').and.returnValue(query);

      // WHEN
      const result = await campaignRepository.list('my-user-id', { page: 0, limit: 5, fields: ['subject', 'id', 'listId', 'userId']});

      // THEN
      expect(result).toEqual([
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnanxzk7000001pa61qk54l8',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkm7d000001qseupu1pv3',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnko74000101qs7cz8d75e',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkp8r000201qsh44ut6q5',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnl0p2000301qsvg0r75eb',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        }
    ]);

    // AND
    expect(campaignSchema.query).toBeCalledWith('my-user-id');
    expect(campaignSchema.query).toBeCalledTimes(1);
    // AND
    expect(limit).toBeCalledWith(5);
    expect(limit).toBeCalledTimes(1);
    // AND
    expect(attributes).toBeCalledWith(['subject', 'id', 'listId', 'userId']);
    expect(attributes).toBeCalledTimes(1);
    // AND
    expect(exec).toBeCalledWith(expect.any(Function));
    expect(exec).toBeCalledTimes(1);
    });

    it('should list the first page of campaigns when requesting the page 1', async () => {
      // GIVEN
      exec.mockImplementation(callback => callback(null, {
        Items: [
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnanxzk7000001pa61qk54l8',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkm7d000001qseupu1pv3',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnko74000101qs7cz8d75e',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkp8r000201qsh44ut6q5',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnl0p2000301qsvg0r75eb',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            }
        ],
        Count: 5,
        ScannedCount: 5,
        LastEvaluatedKey: {
            id: 'cjnbnl0p2000301qsvg0r75eb',
            userId: 'my-user-id'
        }
      }));

      // AND
      spyOn(campaignSchema, 'query').and.returnValue(query);

      // WHEN
      const result = await campaignRepository.list('my-user-id', { page: 1, limit: 5, fields: ['subject', 'id', 'listId', 'userId']});

      // THEN
      expect(result).toEqual([
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnanxzk7000001pa61qk54l8',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkm7d000001qseupu1pv3',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnko74000101qs7cz8d75e',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkp8r000201qsh44ut6q5',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnl0p2000301qsvg0r75eb',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        }
    ]);

      // AND
      expect(campaignSchema.query).toBeCalledWith('my-user-id');
      expect(campaignSchema.query).toBeCalledTimes(1);
      // AND
      expect(limit).toBeCalledWith(5);
      expect(limit).toBeCalledTimes(1);
      // AND
      expect(attributes).toBeCalledWith(['subject', 'id', 'listId', 'userId']);
      expect(attributes).toBeCalledTimes(1);
      // AND
      expect(exec).toBeCalledWith(expect.any(Function));
      expect(exec).toBeCalledTimes(1);
    });

    it('should list the second page of campaigns when requesting the page 2', async () => {
      // GIVEN
      exec.mockImplementation(callback => callback(null, {
        Items: [
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnanxzk7000001pa61qk54l8',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkm7d000001qseupu1pv3',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnko74000101qs7cz8d75e',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkp8r000201qsh44ut6q5',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnl0p2000301qsvg0r75eb',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            }
        ],
        Count: 5,
        ScannedCount: 5,
        LastEvaluatedKey: {
            id: 'cjnbnl0p2000301qsvg0r75eb',
            userId: 'my-user-id'
        }
      }));

      // AND
      spyOn(campaignSchema, 'query').and.returnValue(query);

      // WHEN
      const result = await campaignRepository.list('my-user-id', { page: 2, limit: 5, fields: ['subject', 'id', 'listId', 'userId']});

      // THEN
      expect(result).toEqual([
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnanxzk7000001pa61qk54l8',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkm7d000001qseupu1pv3',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnko74000101qs7cz8d75e',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkp8r000201qsh44ut6q5',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnl0p2000301qsvg0r75eb',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        }
    ]);

      // AND
      expect(campaignSchema.query).toBeCalledWith('my-user-id');
      expect(campaignSchema.query).toBeCalledTimes(2);
      // AND
      expect(limit).toBeCalledWith(5);
      expect(limit).toBeCalledTimes(2);
      // AND
      expect(attributes).toBeCalledWith(['subject', 'id', 'listId', 'userId']);
      expect(attributes).toBeCalledTimes(2);
      // AND
      expect(exec).toBeCalledWith(expect.any(Function));
      expect(exec).toBeCalledTimes(2);
    });

    it('should list the thrid page of campaigns when requesting the page 3', async () => {
      // GIVEN
      exec.mockImplementation(callback => callback(null, {
        Items: [
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnanxzk7000001pa61qk54l8',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkm7d000001qseupu1pv3',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnko74000101qs7cz8d75e',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnkp8r000201qsh44ut6q5',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            },
            {
                subject: 'My first MoonMail Campaign - Ecommerce Template',
                id: 'cjnbnl0p2000301qsvg0r75eb',
                listId: 'cjmqohexu000001qpth88489d',
                userId: 'my-user-id'
            }
        ],
        Count: 5,
        ScannedCount: 5,
        LastEvaluatedKey: {
            id: 'cjnbnl0p2000301qsvg0r75eb',
            userId: 'my-user-id'
        }
      }));

      // AND
      spyOn(campaignSchema, 'query').and.returnValue(query);

      // WHEN
      const result = await campaignRepository.list('my-user-id', { page: 3, limit: 5, fields: ['subject', 'id', 'listId', 'userId']});

      // THEN
      expect(result).toEqual([
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnanxzk7000001pa61qk54l8',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkm7d000001qseupu1pv3',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnko74000101qs7cz8d75e',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnkp8r000201qsh44ut6q5',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        },
        {
            subject: 'My first MoonMail Campaign - Ecommerce Template',
            id: 'cjnbnl0p2000301qsvg0r75eb',
            listId: 'cjmqohexu000001qpth88489d',
            userId: 'my-user-id'
        }
    ]);

      // AND
      expect(campaignSchema.query).toBeCalledWith('my-user-id');
      expect(campaignSchema.query).toBeCalledTimes(3);
      // AND
      expect(limit).toBeCalledWith(5);
      expect(limit).toBeCalledTimes(3);
      // AND
      expect(attributes).toBeCalledWith(['subject', 'id', 'listId', 'userId']);
      expect(attributes).toBeCalledTimes(3);
      // AND
      expect(exec).toBeCalledWith(expect.any(Function));
      expect(exec).toBeCalledTimes(3);
    });

    it('should throw any error', async () => {
      // GIVEN
      exec.mockImplementation(callback => callback(new Error('Some error')));

      // AND
      spyOn(campaignSchema, 'query').and.returnValue(query);

      // WHEN
      try {
        await campaignRepository.list('my-user-id', { page: 3, limit: 5, fields: ['subject', 'id', 'listId', 'userId']});
      } catch (error) {
        // THEN
        expect(error.message).toBe('Some error')

        // AND
        expect(campaignSchema.query).toBeCalledWith('my-user-id');
        expect(campaignSchema.query).toBeCalledTimes(1);
        // AND
        expect(limit).toBeCalledWith(5);
        expect(limit).toBeCalledTimes(1);
        // AND
        expect(attributes).toBeCalledWith(['subject', 'id', 'listId', 'userId']);
        expect(attributes).toBeCalledTimes(1);
        // AND
        expect(exec).toBeCalledWith(expect.any(Function));
        expect(exec).toBeCalledTimes(1);
      }
    });
  });
});
