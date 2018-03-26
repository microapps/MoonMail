import './lib/specHelper';
import Api from './Api';
import EventProcessors from './EventProcessors';
import recipientEventStream from './fixtures/recipientEventStream.json';
import recipientEventStreamInvalidEvents from './fixtures/recipientEventStreamInvalidEvents.json';
import recipientDynamoDBStream from './fixtures/recipientDynamoDBStream.json';

import DeadLetterQueue from './lib/DeadLetterQueue';

describe('EventProcessors', () => {
  describe('.eventStreamProcessor', () => {
    context('when the batch contains valid events', () => {
      beforeEach(() => {
        sinon.stub(Api, 'importRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'createRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'updateRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'processCampaignActivity')
          .resolves({});
      });
      afterEach(() => {
        Api.importRecipientsBatch.restore();
        Api.createRecipientsBatch.restore();
        Api.updateRecipientsBatch.restore();
        Api.processCampaignActivity.restore();
      });

      it('processes the stream', (done) => {
        EventProcessors.eventStreamProcessor(recipientEventStream, {}, (err, actual) => {
          expect(err).to.not.exist;
          done();
        });
      });
    });

    context('when the batch contains invalid events', () => {
      beforeEach(() => {
        sinon.stub(Api, 'importRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'createRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'updateRecipientsBatch')
          .resolves({});

        sinon.stub(DeadLetterQueue, 'put')
          .resolves({});
      });
      afterEach(() => {
        Api.importRecipientsBatch.restore();
        Api.createRecipientsBatch.restore();
        Api.updateRecipientsBatch.restore();
        DeadLetterQueue.put.restore();
      });

      it('enqueues invalid events in the DLQ', (done) => {
        EventProcessors.eventStreamProcessor(recipientEventStreamInvalidEvents, {}, (err, actual) => {
          expect(err).not.to.exist;
          expect(Api.importRecipientsBatch).to.have.been.calledOnce;
          expect(Api.createRecipientsBatch).to.have.been.calledOnce;
          expect(Api.updateRecipientsBatch).to.have.been.calledOnce;
          expect(DeadLetterQueue.put).to.have.been.calledTwice;
          done();
        });
      });
    });

    context('when write capacity is excedeed', () => {
      beforeEach(() => {
        sinon.stub(Api, 'importRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'createRecipientsBatch')
          .rejects(new Error('UnprocessedItems'));

        sinon.stub(Api, 'updateRecipientsBatch')
          .resolves({});

        sinon.stub(DeadLetterQueue, 'put')
          .resolves({});
      });
      afterEach(() => {
        Api.importRecipientsBatch.restore();
        Api.createRecipientsBatch.restore();
        Api.updateRecipientsBatch.restore();
        DeadLetterQueue.put.restore();
      });

      it('the function fails for the batch to be retried', (done) => {
        EventProcessors.eventStreamProcessor(recipientEventStream, {}, (err, actual) => {
          expect(err).to.exist;
          expect(Api.importRecipientsBatch).to.have.been.calledOnce;
          expect(Api.createRecipientsBatch).to.have.been.calledOnce;
          expect(Api.updateRecipientsBatch).not.to.have.been.called;
          expect(DeadLetterQueue.put).not.to.have.been.called;
          done();
        });
      });
    });

    context('when an unexpected error is thrown', () => {
      beforeEach(() => {
        sinon.stub(Api, 'importRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'createRecipientsBatch')
          .resolves({});

        sinon.stub(Api, 'updateRecipientsBatch')
          .rejects(new Error('KeySchema missmatch'));

        sinon.stub(DeadLetterQueue, 'put')
          .resolves({});
      });
      afterEach(() => {
        Api.importRecipientsBatch.restore();
        Api.createRecipientsBatch.restore();
        Api.updateRecipientsBatch.restore();
        DeadLetterQueue.put.restore();
      });

      it('the whole batch gets enqueued into the DLQ', (done) => {
        EventProcessors.eventStreamProcessor(recipientEventStream, {}, (err, actual) => {
          expect(err).not.to.exist;
          expect(Api.importRecipientsBatch).to.have.been.calledOnce;
          expect(Api.createRecipientsBatch).to.have.been.calledOnce;
          expect(Api.updateRecipientsBatch).to.have.been.calledOnce;
          expect(DeadLetterQueue.put.callCount).to.equals(7);
          done();
        });
      });
    });
  });
  describe('.syncRecipientStreamWithES', () => {
    context('when the batch contains valid events', () => {
      beforeEach(() => {
        sinon.stub(Api, 'createRecipientEs')
          .resolves({});

        sinon.stub(Api, 'updateRecipientEs')
          .resolves({});

        sinon.stub(Api, 'deleteRecipientEs')
          .resolves({});
      });
      afterEach(() => {
        Api.createRecipientEs.restore();
        Api.updateRecipientEs.restore();
        Api.deleteRecipientEs.restore();
      });

      it('processes the stream', (done) => {
        EventProcessors.syncRecipientStreamWithES(recipientDynamoDBStream, {}, (err, actual) => {
          expect(err).to.not.exist;
          done();
        });
      });
    });

    context('when an unexpected error ocurrs', () => {
      beforeEach(() => {
        sinon.stub(Api, 'createRecipientEs')
          .resolves({});

        sinon.stub(Api, 'updateRecipientEs')
          .rejects(new Error('ES Error'));

        sinon.stub(Api, 'deleteRecipientEs')
          .resolves({});

        sinon.stub(DeadLetterQueue, 'put')
          .resolves({});
      });
      afterEach(() => {
        Api.createRecipientEs.restore();
        Api.updateRecipientEs.restore();
        Api.deleteRecipientEs.restore();
        DeadLetterQueue.put.restore();
      });

      it('enqueue invalid items into the DLQ', (done) => {
        EventProcessors.syncRecipientStreamWithES(recipientDynamoDBStream, {}, (err, actual) => {
          expect(err).to.not.exist;
          expect(DeadLetterQueue.put.callCount).to.equals(5);
          done();
        });
      });
    });
  });
});
