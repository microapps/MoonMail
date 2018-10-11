import dynamoService, {client} from './dynamo';
import campaign from './campaign';

describe('DynamoService', () => {
  beforeEach(() => {
    process.env.CAMPAIGN_TABLE = 'companyTable';
  });

  describe('Create', () => {
    it('should save the provided object', async () => {
      // GIVEN
      spyOn(client, 'put').and.callFake((param, callback) => {callback()});
  
      // WHEN
      const result = await dynamoService.put({
        id: 'someId',
        userId: 'my-user-id',
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
      });
  
      // THEN
      expect(result).toEqual({
        id: 'someId',
        userId: 'my-user-id',
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
      });

      // AND
      expect(client.put).toHaveBeenCalledWith({
        TableName: 'companyTable',
        Item: {
          id: 'someId',
          userId: 'my-user-id',
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
        }
      },
      expect.any(Function));
    });
  
    it('should raise the error if something goes wrong in Item creation', async () => {
      // GIVEN
      spyOn(client, 'put').and.callFake((param, callback) => {callback('error on AWS API')});
  
      // WHEN
      try {
        await dynamoService.put({
          id: 'someId',
          userId: 'my-user-id',
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
        });

      } catch (error) {
        // THEN
        expect(error).toBe('error on AWS API');

        // AND
        expect(client.put).toHaveBeenCalledWith({
          TableName: 'companyTable',
          Item: {
            id: 'someId',
            userId: 'my-user-id',
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
          }
        },
        expect.any(Function));
      }
    });
  });

  describe('Delete', () => {
    it('should delete the campaign', async () => {
      // GIVEN
      spyOn(client, 'delete').and.callFake((param, callback) => callback());

      // WHEN
      const result = await dynamoService.delete('someId','my-user-id');

      // THEN
      expect(result).toBe(true);
    });

    it('should raise the error if AWS Dynamo lib throws an error', async () => {
      // GIVEN
      spyOn(client, 'delete').and.callFake((param, callback) => callback('error'));

      // WHEN
      try {
        await dynamoService.delete('someId','my-user-id');
      } catch (error) {
        // THEN
        expect(error).toBe('error');
      }
    });
  });

  describe('Update', () => {
    it('should update the object set to DELETE the null and empty properties', async () => {
      // GIVEN
      spyOn(client, 'update').and.callFake((params, callback) => callback(null, {
        id: 'someId',
        userId: 'my-user-id',
        scheduleAt: 0
      }));

      // WHEN
      const result = await dynamoService.update({
        id: 'someId',
        userId: 'my-user-id',
        segmentId: '',
        subject: null,
        scheduleAt: 0
      }, 'my-user-id', 'someId');

      // THEN
      expect(client.update).toBeCalledWith({
        AttributeUpdates: {
          scheduleAt: {
            Action: 'PUT',
            'Value': 0},
            segmentId: {
              Action: 'DELETE'
            },
            subject: {
              Action: 'DELETE'
            }
          },
          Key: {
            id: 'someId',
            userId: 'my-user-id'
          },
          ReturnValues: 'ALL_NEW',
          TableName: 'companyTable'
        },
        expect.any(Function)
      );

      // AND
      expect(result).toEqual({
        id: 'someId',
        userId: 'my-user-id',
        scheduleAt: 0
      });
    });

    it('should throw any error from AWS API', async () => {
      // GIVEN
      spyOn(client, 'update').and.callFake((params, callback) => callback('Some error AWS Error'));

      // WHEN
      try {
        await dynamoService.update({
          id: 'someId',
          userId: 'my-user-id',
          segmentId: '',
          subject: null,
          scheduleAt: 0
        }, 'my-user-id', 'someId');
      } catch (error) {
        // THEN
        expect(client.update).toBeCalledWith(
          {
            AttributeUpdates: {
              scheduleAt: {
                Action: 'PUT',
                'Value': 0
              },
              segmentId: {
                Action: 'DELETE'
              },
              subject: {
                Action: 'DELETE'
              }
            },
            Key: {
              id: 'someId',
              userId: 'my-user-id'
            },
            ReturnValues: 'ALL_NEW',
            TableName: 'companyTable'
          },
          expect.any(Function)
        );

        // AND
        expect(error).toBe('Some error AWS Error');
      }
    });
  });
});