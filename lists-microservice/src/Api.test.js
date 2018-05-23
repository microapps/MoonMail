import './lib/specHelper';
import Api from './Api';
import Events from './domain/Events';
import EventLog from './EventLog';
import Recipients from './domain/Recipients';
import Lists from './domain/Lists';
import RecipientModel from './domain/RecipientModel';
import RecipientESModel from './domain/RecipientESModel';
import MapCsvStringToRecipients from './recipients/MapCsvStringToRecipients';
import ListSegments from './domain/ListSegments';
import RecipientActivities from './domain/RecipientActivities';

describe('Api', () => {
  const listId = 'list-id';
  const userId = 'user-id';
  const eventLogResponse = { success: true };

  beforeEach(() => sinon.stub(EventLog, 'write').resolves(eventLogResponse));
  afterEach(() => EventLog.write.restore());

  describe('.publishRecipientCreatedEvent', () => {
    const subscriptionOrigin = 'signupForm';
    const recipient = { email: 'david.garcia@microapps.com' };
    const invalidRecipient = { email: 'invalid' };
    const recipientCreatedEvent = { payload: { recipient } };

    beforeEach(() => {
      sinon.stub(Events, 'buildRecipientCreatedEvent')
        .withArgs({ listId, userId, recipient, subscriptionOrigin }).resolves(recipientCreatedEvent)
        .withArgs({ listId, userId, recipient: invalidRecipient, subscriptionOrigin })
        .rejects(new Error('Ooops'));
    });
    afterEach(() => Events.buildRecipientCreatedEvent.restore());

    it('publishes a recipient created event', async () => {
      const res = await Api.publishRecipientCreatedEvent({ listId, userId, createRecipientPayload: recipient, subscriptionOrigin });
      expect(res).to.deep.equal(eventLogResponse);
    });

    it('is rejected when the recipient is invalid', async () => {
      try {
        const res = await Api.publishRecipientCreatedEvent({ listId, userId, createRecipientPayload: invalidRecipient, subscriptionOrigin });
        expect(res).not.to.exist();
      } catch (err) {
        expect(err).to.exist;
        expect(EventLog.write).not.to.have.been.called;
      }
    });
  });

  describe('.publishRecipientUpdatedEvent', () => {
    const recipientId = 'recipient-id';
    const payload = { recipient: { id: recipientId, email: 'david.garcia@microapps.com' } };
    const invalidPayload = { email: 'invalid' };
    const recipientUpdatedEvent = { payload };

    beforeEach(() => {
      sinon.stub(Events, 'buildRecipientUpdatedEvent')
        .withArgs({ listId, userId, id: recipientId, data: payload }).resolves(recipientUpdatedEvent)
        .withArgs({ listId, userId, id: recipientId, data: invalidPayload })
        .rejects(new Error('Ooops'));
    });
    afterEach(() => Events.buildRecipientUpdatedEvent.restore());

    it('publishes a recipient updated event', async () => {
      const res = await Api.publishRecipientUpdatedEvent({ listId, userId, recipientId, updateRecipientPayload: payload });
      expect(res).to.deep.equal(eventLogResponse);
    });

    it('is rejected when the payload is invalid', async () => {
      try {
        const res = await Api.publishRecipientUpdatedEvent({ listId, userId, recipientId, updateRecipientPayload: invalidPayload });
        expect(res).not.to.exist();
      } catch (err) {
        expect(err).to.exist;
        expect(EventLog.write).not.to.have.been.called;
      }
    });
  });

  describe('.publishRecipientDeletedEvent', () => {
    const recipientId = 'recipient-id';
    const recipientDeletedEvent = { payload: { the: 'event' } };

    beforeEach(() => {
      sinon.stub(Events, 'buildRecipientDeleteEvent')
        .withArgs({ listId, userId, id: recipientId }).resolves(recipientDeletedEvent)
        .withArgs({ listId, userId })
        .rejects(new Error('Ooops'));
    });
    afterEach(() => Events.buildRecipientDeleteEvent.restore());

    it('publishes a recipient updated event', async () => {
      const res = await Api.publishRecipientDeletedEvent({ listId, userId, recipientId });
      expect(res).to.deep.equal(eventLogResponse);
    });

    it('is rejected when the payload is invalid', async () => {
      try {
        const res = await Api.publishRecipientDeletedEvent({ listId, userId });
        expect(res).not.to.exist();
      } catch (err) {
        expect(err).to.exist;
        expect(EventLog.write).not.to.have.been.called;
      }
    });
  });

  describe('.publishRecipientImportedEvents', () => {
    const validRecipient = { email: 'david.garcia@microapps.com', listId: 'list-id', userId: 'user-id' };
    const invalidRecipient = { email: 'no-email' };
    const importId = 'import-id';

    context('when there is an invalid event in the batch', () => {
      const recipientsBatch = [validRecipient, invalidRecipient, validRecipient];

      before(() => sinon.spy(EventLog, 'batchWrite'));
      after(() => EventLog.batchWrite.restore());

      it('does not import any recipient', async () => {
        try {
          const total = recipientsBatch.length;
          const res = await Api.publishRecipientImportedEvents(recipientsBatch, importId, 0, total);
          expect(res).not.to.exist();
        } catch (err) {
          expect(err.message).to.include('ValidationFailed');
          expect(EventLog.write).not.to.have.been.called;
        }
      });
    });

    context('when all the recipients in the batch are valid', () => {
      const recipientsBatch = [validRecipient, validRecipient, validRecipient];
      const streamName = 'list-recipient-stream-name';

      before(() => {
        process.env.LIST_RECIPIENT_STREAM_NAME = streamName;
        sinon.stub(EventLog, 'batchWrite').resolves(true);
      });
      after(() => {
        delete process.env.LIST_RECIPIENT_STREAM_NAME;
        EventLog.batchWrite.restore();
      });

      it('should import the whole batch', async () => {
        const total = recipientsBatch.length;
        const expectedBatch = recipientsBatch.map((recipient, index) => Events.buildRecipientImportedEvent({
          recipient,
          importId,
          recipientIndex: index,
          total
        }).value);
        await Api.publishRecipientImportedEvents(recipientsBatch, importId, 0, total);
        const expected = {
          topic: Events.listRecipientImported,
          streamName,
          data: expectedBatch
        };
        expect(EventLog.batchWrite).to.have.been.calledWith(expected);
      });
    });
  });

  describe('.getRecipient', () => {
    const recipient = { email: 'david.garcia@microapps.com' };

    before(() => sinon.stub(Recipients, 'find').resolves(recipient));
    after(() => Recipients.find.restore());

    it('gets a recipient by its id', async () => {
      const recipientId = 'recipient-id';
      const res = await Api.getRecipient({ listId, recipientId });
      expect(res).to.deep.equal(recipient);
      expect(Recipients.find).to.have.been.calledWithExactly({ listId, recipientId });
    });
  });

  describe('.createRecipientsBatch', () => {
    const response = { success: true };

    before(() => sinon.stub(Recipients, 'createBatchFromEvents').resolves(response));
    after(() => Recipients.createBatchFromEvents.restore());

    it('creates a recipients batch', async () => {
      const batch = ['recipient-1', 'recipient-2'];
      const res = await Api.createRecipientsBatch(batch);
      expect(res).to.deep.equal(response);
      expect(Recipients.createBatchFromEvents).to.have.been.calledWithExactly(batch);
    });
  });

  describe('.updateRecipientsBatch', () => {
    const response = { success: true };

    before(() => sinon.stub(Recipients, 'updateBatchFromEvents').resolves(response));
    after(() => Recipients.updateBatchFromEvents.restore());

    it('creates a recipients batch', async () => {
      const batch = ['recipient-1', 'recipient-2'];
      const res = await Api.updateRecipientsBatch(batch);
      expect(res).to.deep.equal(response);
      expect(Recipients.updateBatchFromEvents).to.have.been.calledWithExactly(batch);
    });
  });

  describe('.importRecipientsBatch', () => {
    const recipientEvents = [{ recipient: 1 }, { recipient: 2 }];
    const importResponse = { success: true };

    before(() => {
      sinon.stub(Recipients, 'importFromEvents')
        .withArgs(recipientEvents).resolves(true);
      sinon.stub(Lists, 'updateMetadataAttrsAndImportStatusFromEvents')
        .withArgs(recipientEvents).resolves(importResponse);
    });
    after(() => {
      Recipients.importFromEvents.restore();
      Lists.updateMetadataAttrsAndImportStatusFromEvents.restore();
    });

    it('imports a recipients batch', async () => {
      const res = await Api.importRecipientsBatch(recipientEvents);
      expect(res).to.deep.equal(importResponse);
      expect(Recipients.importFromEvents).to.have.been.calledWithExactly(recipientEvents);
      expect(Lists.updateMetadataAttrsAndImportStatusFromEvents).to.have.been.calledWith(recipientEvents);
    });
  });

  describe('.deleteRecipientEs', () => {
    const recipient = { id: 'rid', listId: 'lid', email: 'david.garcia@microapps.com' };

    before(() => sinon.stub(RecipientESModel, 'remove').resolves(true));
    after(() => RecipientESModel.remove.restore());

    it('deletes a recipient in ES', async () => {
      const globalId = RecipientModel.buildGlobalId({ recipient });
      await Api.deleteRecipientEs(recipient);
      expect(RecipientESModel.remove).to.have.been.calledWithExactly(globalId);
    });
  });

  describe('.fetchUndeliveredRecipients', () => {
    before(() => sinon.stub(RecipientESModel, 'undeliverableRecipients').resolves({ items: [1, 2], total: 2 }));
    after(() => RecipientESModel.undeliverableRecipients.restore());

    it('fetches all bounced, complaint and unsubscribed recipients for a particular list', async () => {
      await Api.fetchUndeliverableRecipients({ listId: 'some-list-id' });
      expect(RecipientESModel.undeliverableRecipients).to.have.been.calledWithExactly({ listId: 'some-list-id', from: 0, size: 250 });
    });
  });

  describe('.processCampaignActivity', () => {
    before(() => {
      sinon.stub(RecipientActivities, 'appendRecipientActivity').resolves({});
    });
    after(() => RecipientActivities.appendRecipientActivity.restore());

    it('transforms the events structure to build the activities', async () => {
      const events = [
        {
          type: Events.emailDelivered,
          payload: {
            campaignId: 'some-campaign-id',
            timestamp: 1231313,
            recipientId: 'some-recipient-id',
            listId: 'some-list-id'
          }
        },
        {
          type: Events.emailClicked,
          payload: {
            campaignId: 'some-campaign-id',
            timestamp: 1231313,
            recipientId: 'some-recipient-id',
            listId: 'some-list-id'
          }
        },
        {
          type: Events.emailOpened,
          payload: {
            campaignId: 'some-campaign-id',
            timestamp: 1231313,
            recipientId: 'some-recipient-id',
            listId: 'some-list-id'
          }
        }
      ];
      await Api.processCampaignActivity(events);
      expect(RecipientActivities.appendRecipientActivity).to.have.been.calledThrice;
    });
  });

  describe('.createRecipientEs', () => {
    it('delegates on Recipients.createEs', () => {
      expect(Api.createRecipientEs).to.equal(Recipients.createEs);
    });
  });

  describe('.updateRecipientEs', () => {
    it('delegates on Recipients.updateEs', () => {
      expect(Api.updateRecipientEs).to.equal(Recipients.updateEs);
    });
  });

  describe('.mapCsvStringToRecipients', () => {
    it('delegates on MapCsvStringToRecipients.execute', () => {
      expect(Api.mapCsvStringToRecipients).to.equal(MapCsvStringToRecipients.execute);
    });
  });

  describe('.searchRecipients', () => {
    it('delegates on Recipients.search', () => {
      expect(Api.searchRecipients).to.equal(Recipients.search);
    });
  });

  describe('.getAllLists', () => {
    it('delegates on Lists.all', () => {
      expect(Api.getAllLists).to.equal(Lists.all);
    });
  });

  describe('.createSegment', () => {
    it('delegates on ListSegments.create', () => {
      expect(Api.createSegment).to.equal(ListSegments.create);
    });
  });

  describe('.updateSegment', () => {
    it('delegates on ListSegments.update', () => {
      expect(Api.updateSegment).to.equal(ListSegments.update);
    });
  });

  describe('.deleteSegment', () => {
    it('delegates on ListSegments.delete', () => {
      expect(Api.deleteSegment).to.equal(ListSegments.remove);
    });
  });

  describe('.listSegments', () => {
    it('delegates on ListSegments.list', () => {
      expect(Api.listSegments).to.equal(ListSegments.list);
    });
  });

  describe('.getSegmentMembers', () => {
    it('delegates on ListSegments.getMembers', () => {
      expect(Api.getSegmentMembers).to.equal(ListSegments.getMembers);
    });
  });

  describe('.createActivity', () => {
    it('delegates on RecipientActivities.create', () => {
      expect(Api.createActivity).to.equal(RecipientActivities.create);
    });
  });
});
