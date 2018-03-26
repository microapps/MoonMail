import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import FirehorseNotifier from './FirehorseNotifier';

const expect = chai.expect;
chai.use(sinonChai);

describe('FirehorseNotifier', () => {
  describe('.publishBatch', () => {
    let firehorseStub;
    const eventType = 'event.type';
    const subscription = { type: eventType, subscriberType: 'firehorse', subscribedResource: 'StreamName' };
    const events = [
      { type: eventType, payload: { the: 'data' } },
      { type: eventType, payload: { more: 'data' } }
    ];
    const firehorseResult = {
      FailedPutCount: 1,
      RequestResponses: [
        { ErrorCode: 'code', ErrorMessage: 'string', SequenceNumber: '123', ShardId: '567' },
        { RecordId: '567' }
      ]
    };

    beforeEach(() => {
      firehorseStub = { putRecordBatch: sinon.spy(() => ({ promise: () => Promise.resolve(firehorseResult) })) };
      sinon.stub(FirehorseNotifier, 'getClient').returns(firehorseStub);
    });
    afterEach(() => {
      FirehorseNotifier.getClient.restore();
    });

    it('should write the event to the Kinesis Stream', async () => {
      await FirehorseNotifier.publishBatch(events, subscription);
      const expected = {
        Records: events.map(evt => ({ Data: JSON.stringify(evt) })),
        DeliveryStreamName: subscription.subscribedResource
      };
      expect(firehorseStub.putRecordBatch).to.have.been.calledWith(expected);
    });

    it('should return the events and errors if any', async () => {
      const actual = await FirehorseNotifier.publishBatch(events, subscription);
      const expected = {
        records: [
          { event: events[0], subscription, error: firehorseResult.RequestResponses[0].ErrorMessage, errorCode: firehorseResult.RequestResponses[0].ErrorCode },
          { event: events[1], subscription }
        ]
      };
      expect(actual).to.deep.equal(expected);
    });
  });
});
