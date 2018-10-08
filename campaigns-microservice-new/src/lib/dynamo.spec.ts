import dynamoService, {client} from './dynamo';

describe('DynamoService', () => {
  it('should save the provided object', async () => {
    // GIVEN
    spyOn(client, 'put').and.callFake((param, callback) => {callback()});

    // WHEN
    const result = await dynamoService.put({
      TableName: 'someTableName',
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
  });

  it('should save the provided object', async () => {
    // GIVEN
    spyOn(client, 'put').and.callFake((param, callback) => {callback('error')});

    // WHEN
    try {
      await dynamoService.put({
        TableName: 'someTableName',
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
      });
    } catch (error) {
      // THEN
      expect(error).toBe('error');
    }

  });
});