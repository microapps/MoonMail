import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import EventsRouter from './EventsRouter';
import SubscriptionRepo from '../repositories/Subscription';
import KinesisNotifier from '../notifiers/KinesisNotifier';
import EventsDeadLetterQueue from '../lib/EventsDeadLetterQueue';
import FirehoseNotifier from '../notifiers/FirehoseNotifier';

const { expect } = chai;
chai.use(sinonChai);

describe('EventsRouter', () => {
  describe('.execute', () => {
    const buildKinesisEvent = evt => ({
      kinesis: { data: Buffer.from(JSON.stringify(evt)).toString('base64') },
      eventID: 'shardId-000:12345'
    });
    const aTypeEvents = [
      { type: 'aType', payload: { the: 'data' } },
      { type: 'aType', payload: { more: 'data' } }
    ];
    const anotherTypeEvents = [{ type: 'anotherType', payload: { some: 'data' } }];
    const anotherMoreTypeEvents = [{ type: 'anotherMoreType', payload: { some: 'data' } }];
    const noSubscriptionEvents = [{ type: 'noSubscriptionEvents', payload: { some: 'data' } }];
    const aTypeSubscription = { type: 'aType', subscriberType: 'kinesis', subscribedResource: 'StreamName' };
    const anotherTypeSubscription = { type: 'anotherType', subscriberType: 'kinesis', subscribedResource: 'AnotherStreamName' };
    const anotherMoreTypeSubscription = { type: 'anotherMoreType', subscriberType: 'firehose', subscribedResource: 'ADeliveryStream' };
    const subscriptions = [aTypeSubscription, anotherTypeSubscription, anotherMoreTypeSubscription];
    const kinesisStream = { Records: [...aTypeEvents, ...anotherTypeEvents, ...anotherMoreTypeEvents, ...noSubscriptionEvents].map(evt => buildKinesisEvent(evt)) };
    const aTypeResponse = {
      records: [
        { event: aTypeEvents[0], subscription: aTypeSubscription, error: 'Some error', errorCode: 1234 },
        { event: aTypeEvents[1], subscription: aTypeSubscription }
      ]
    };
    const anotherTypeResponse = {
      records: [
        { event: anotherTypeEvents[0], subscription: anotherTypeSubscription, error: 'Some other error', errorCode: 567 }
      ]
    };
    const anotherMoreTypeResponse = {
      records: [
        { event: anotherMoreTypeEvents[1], subscription: anotherTypeSubscription }
      ]
    };

    beforeEach(() => {
      sinon.stub(SubscriptionRepo, 'getAll').resolves(subscriptions);
      sinon.stub(KinesisNotifier, 'publishBatch')
        .withArgs(sinon.match.any).rejects(new Error('Kinesis error'))
        .withArgs(aTypeEvents, aTypeSubscription)
        .resolves(aTypeResponse)
        .withArgs(anotherTypeEvents, anotherTypeSubscription)
        .resolves(anotherTypeResponse);
      sinon.stub(FirehoseNotifier, 'publishBatch')
        .withArgs(anotherMoreTypeEvents, anotherMoreTypeSubscription).resolves(anotherMoreTypeResponse);
      sinon.stub(EventsDeadLetterQueue, 'put').resolves(true);
    });
    afterEach(() => {
      SubscriptionRepo.getAll.restore();
      KinesisNotifier.publishBatch.restore();
      FirehoseNotifier.publishBatch.restore();
      EventsDeadLetterQueue.put.restore();
    });

    it('should route events according to subscriptions', async () => {
      await EventsRouter.execute(kinesisStream);
      expect(KinesisNotifier.publishBatch).to.have.been.calledTwice;
      expect(FirehoseNotifier.publishBatch).to.have.been.calledOnce;
      const expectations = [
        [aTypeEvents, aTypeSubscription],
        [anotherTypeEvents, anotherTypeSubscription]
      ];
      expectations.forEach((expected) => {
        expect(KinesisNotifier.publishBatch).to.have.been.calledWithExactly(...expected);
      });
      expect(FirehoseNotifier.publishBatch).to.have.been.calledWithExactly(...[anotherMoreTypeEvents, anotherMoreTypeSubscription]);
    });

    it('should send errored records to DLQ', async () => {
      await EventsRouter.execute(kinesisStream);
      expect(EventsDeadLetterQueue.put).to.have.been.calledTwice;
      const expectations = [aTypeResponse.records[0], anotherTypeResponse.records[0]];
      expectations.forEach((expected) => {
        expect(EventsDeadLetterQueue.put).to.have.been.calledWithExactly(expected);
      });
    });

    context('when there is an unexpected error', () => {
      const unexpectedError = new Error('Boom!');

      beforeEach(() => {
        SubscriptionRepo.getAll.rejects(unexpectedError);
      });

      it('should all the whole stream as errored records to DLQ', async () => {
        await EventsRouter.execute(kinesisStream);
        expect(EventsDeadLetterQueue.put).to.have.been.calledOnce;
        const expected = { stream: kinesisStream, error: unexpectedError.message };
        expect(EventsDeadLetterQueue.put).to.have.been.calledWithExactly(expected);
      });
    });
  });
});
