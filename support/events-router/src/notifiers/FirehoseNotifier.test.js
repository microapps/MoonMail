import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import FirehoseNotifier from './FirehoseNotifier';

const expect = chai.expect;
chai.use(sinonChai);

describe('FirehoseNotifier', () => {
  describe('.publishBatch', () => {
    let firehoseStub;
    const eventType = 'event.type';
    const subscription = { type: eventType, subscriberType: 'firehose', subscribedResource: 'StreamName' };
    const events = [
      { type: eventType, payload: { the: 'data' } },
      { type: eventType, payload: { more: 'data' } }
    ];
    const firehoseResult = {
      FailedPutCount: 1,
      RequestResponses: [
        { ErrorCode: 'code', ErrorMessage: 'string', SequenceNumber: '123', ShardId: '567' },
        { RecordId: '567' }
      ]
    };

    beforeEach(() => {
      firehoseStub = { putRecordBatch: sinon.spy(() => ({ promise: () => Promise.resolve(firehoseResult) })) };
      sinon.stub(FirehoseNotifier, 'getClient').returns(firehoseStub);
    });
    afterEach(() => {
      FirehoseNotifier.getClient.restore();
    });

    it('should write the event to the Kinesis Stream', async () => {
      await FirehoseNotifier.publishBatch(events, subscription);
      const expected = {
        Records: events.map(evt => ({ Data: JSON.stringify(evt) })),
        DeliveryStreamName: subscription.subscribedResource
      };
      expect(firehoseStub.putRecordBatch).to.have.been.calledWith(expected);
    });

    it('should return the events and errors if any', async () => {
      const actual = await FirehoseNotifier.publishBatch(events, subscription);
      const expected = {
        records: [
          { event: events[0], subscription, error: firehoseResult.RequestResponses[0].ErrorMessage, errorCode: firehoseResult.RequestResponses[0].ErrorCode },
          { event: events[1], subscription }
        ]
      };
      expect(actual).to.deep.equal(expected);
    });
  });
});
