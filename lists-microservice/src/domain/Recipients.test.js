import '../lib/specHelper';
import Recipients from './Recipients';
import RecipientModel from './RecipientModel';
import RecipientESModel from './RecipientESModel';

describe('Recipients', () => {
  it('delegates several methods to RecipientESModel and RecipientModel', () => {
    const delegatedMethods = {
      buildId: RecipientModel.buildId,
      create: RecipientModel.create,
      batchCreate: RecipientModel.batchCreate,
      update: RecipientModel.update,
      delete: RecipientModel.delete,
      find: RecipientESModel.find,
      createEs: RecipientESModel.create,
      updateEs: RecipientESModel.update,
      deleteEs: RecipientESModel.remove,
      searchByListAndConditions: RecipientESModel.searchByListAndConditions,
      search: RecipientESModel.search
    };
    Object.entries(delegatedMethods).forEach(([method, delegate]) => {
      expect(Recipients[method]).to.equal(delegate);
    });
  });

  describe('.createBatchFromEvents', () => {
    const recipientEvents = [
      { payload: { recipient: { email: 'david.garcia@microapps.com' } } },
      { payload: { recipient: { email: 'david.garcia+1@microapps.com' } } }
    ];

    context('when everything went fine', () => {
      before(() => sinon.stub(RecipientModel, 'batchCreate').resolves({}));
      after(() => RecipientModel.batchCreate.restore());

      it('creates a batch of recipients from events', async () => {
        const expected = recipientEvents.map(r => r.payload.recipient);
        await Recipients.createBatchFromEvents(recipientEvents);
        expect(RecipientModel.batchCreate).to.have.been.calledWithExactly(expected);
      });
    });

    context('when there were unprocessed items', () => {
      before(() => sinon.stub(RecipientModel, 'batchCreate').resolves({ UnprocessedItems: [{ error: true }] }));
      after(() => RecipientModel.batchCreate.restore());

      it('rejects the promise', async () => {
        try {
          const res = await Recipients.createBatchFromEvents(recipientEvents);
          expect(res).not.to.exist;
        } catch (err) {
          expect(err.message).to.equal('UnprocessedItems');
        }
      });
    });
  });

  describe('.importFromEvents', () => {
    const recipientEvents = [
      { payload: { recipient: { email: 'david.garcia@microapps.com' } } },
      { payload: { recipient: { email: 'david.garcia+1@microapps.com' } } }
    ];

    context('when everything went fine', () => {
      before(() => sinon.stub(RecipientModel, 'batchCreate').resolves({}));
      after(() => RecipientModel.batchCreate.restore());

      it('creates a batch of recipients from events', async () => {
        const recipientStatus = {
          status: RecipientModel.statuses.subscribed,
          subscriptionOrigin: RecipientModel.subscriptionOrigins.listImport,
          isConfirmed: true
        };
        const expected = recipientEvents.map(r => Object.assign({}, r.payload.recipient, recipientStatus));
        await Recipients.importFromEvents(recipientEvents);
        expect(RecipientModel.batchCreate).to.have.been.calledWithExactly(expected);
      });
    });

    context('when there were unprocessed items', () => {
      before(() => sinon.stub(RecipientModel, 'batchCreate').resolves({ UnprocessedItems: [{ error: true }] }));
      after(() => RecipientModel.batchCreate.restore());

      it('rejects the promise', async () => {
        try {
          const res = await Recipients.importFromEvents(recipientEvents);
          expect(res).not.to.exist;
        } catch (err) {
          expect(err.message).to.equal('UnprocessedItems');
        }
      });
    });
  });

  describe('.updateBatchFromEvents', () => {
    const recipientEvents = [
      { payload: { data: { metadata: { name: 'David' } }, listId: 'list-id', id: 'r-id' } },
      { payload: { data: { metadata: { surname: 'García' } }, listId: 'list-id', id: 'r2-id' } }
    ];

    before(() => sinon.stub(RecipientModel, 'update').resolves({}));
    after(() => RecipientModel.update.restore());

    it('creates a batch of recipients from events', async () => {
      const expectations = recipientEvents.map(r => [r.payload.data, r.payload.listId, r.payload.id]);
      await Recipients.updateBatchFromEvents(recipientEvents);
      expect(RecipientModel.update).to.have.been.calledTwice;
      expectations.forEach(expected => expect(RecipientModel.update).to.have.been.calledWithExactly(...expected));
    });
  });
});
