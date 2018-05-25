import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import KinesisNotifier from './KinesisNotifier';

const expect = chai.expect;
chai.use(sinonChai);

describe('KinesisNotifier', () => {
  describe('.publishBatch', () => {
    let kinesisStub;
    const eventType = 'event.type';
    const subscription = { type: eventType, subscriberType: 'kinesis', subscribedResource: 'StreamName' };
    const events = [
      { type: eventType, payload: { the: 'data' } },
      { type: eventType, payload: { more: 'data' } }
    ];
    const kinesisResult = {
      FailedRecordCount: 1,
      Records: [
        { ErrorCode: 'code', ErrorMessage: 'string', SequenceNumber: '123', ShardId: '567' },
        { SequenceNumber: '123', ShardId: '567' }
      ]
    };

    context('when the Kinesis Stream is available', () => {
      beforeEach(() => {
        kinesisStub = { putRecords: sinon.spy(() => ({ promise: () => Promise.resolve(kinesisResult) })) };
        sinon.stub(KinesisNotifier, 'getClient').returns(kinesisStub);
      });
      afterEach(() => {
        KinesisNotifier.getClient.restore();
      });

      it('should write the event to the Kinesis Stream', async () => {
        await KinesisNotifier.publishBatch(events, subscription);
        const expected = {
          Records: events.map(evt => ({ Data: JSON.stringify(evt), PartitionKey: eventType })),
          StreamName: subscription.subscribedResource
        };
        expect(kinesisStub.putRecords).to.have.been.calledWith(expected);
      });

      it('should return the events and errors if any', async () => {
        const actual = await KinesisNotifier.publishBatch(events, subscription);
        const expected = {
          records: [
            { event: events[0], subscription, error: kinesisResult.Records[0].ErrorMessage, errorCode: kinesisResult.Records[0].ErrorCode },
            { event: events[1], subscription }
          ]
        };
        expect(actual).to.deep.equal(expected);
      });
    });

    context('when the Kinesis Stream is not available', () => {
      beforeEach(() => {
        kinesisStub = { putRecords: sinon.spy(() => ({ promise: () => Promise.reject(new Error('Kinesis error')) })) };
        sinon.stub(KinesisNotifier, 'getClient').returns(kinesisStub);
      });
      afterEach(() => {
        KinesisNotifier.getClient.restore();
      });

      it('returns all the events as errored', async () => {
        const actual = await KinesisNotifier.publishBatch(events, subscription);
        const expected = {
          records: [
            { event: events[0], subscription, error: 'Kinesis error' },
            { event: events[1], subscription, error: 'Kinesis error' }
          ]
        };
        expect(actual).to.deep.equal(expected);
      });
    });
  });
});
