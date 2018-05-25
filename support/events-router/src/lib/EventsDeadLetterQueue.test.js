import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import EventsDeadLetterQueue from './EventsDeadLetterQueue';

const expect = chai.expect;
chai.use(sinonChai);

describe('EventsDeadLetterQueue', () => {
  describe('.put', () => {
    let sqsStub;
    const queueUrl = 'https://the-queue-url.com';

    beforeEach(() => {
      sqsStub = { sendMessage: sinon.spy(() => ({ promise: () => Promise.resolve(true) })) };
      sinon.stub(EventsDeadLetterQueue, 'getClient').returns(sqsStub);
      process.env.DEAD_LETTER_QUEUE_URL = queueUrl;
    });
    afterEach(() => {
      EventsDeadLetterQueue.getClient.restore();
      delete process.env.DEAD_LETTER_QUEUE_URL;
    });

    it('should write the event to the dead letter queue', async () => {
      const event = { whatever: { we: 'would like to put' } };
      await EventsDeadLetterQueue.put(event);
      const expected = {
        MessageBody: JSON.stringify(event),
        QueueUrl: queueUrl
      };
      expect(sqsStub.sendMessage).to.have.been.calledWith(expected);
    });
  });
});
