import dynamoService, {client} from './dynamo';

describe('DynamoService', () => {
  describe('Create', () => {
    it('should save the provided object', async () => {
      // GIVEN
      process.env.CAMPAIGN_TABLE = 'companyTable';
      spyOn(client, 'put').and.callFake((param, callback) => {callback()});
  
      // WHEN
      const result = await dynamoService.put({
        id: 'someId',
        usreId: 'my-user-id',
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
        usreId: 'my-user-id',
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
          usreId: 'my-user-id',
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
          usreId: 'my-user-id',
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
            usreId: 'my-user-id',
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
  })
});