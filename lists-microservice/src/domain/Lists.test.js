import '../lib/specHelper';
import Lists from './Lists';
import ListImportStatus from './ListImportStatus';
import ListModel from './ListModel';

describe('Lists', () => {
  it('delegates several methods to RecipientESModel and ListModel', () => {
    const delegatedMethods = {
      create: ListModel.create,
      update: ListModel.update,
      delete: ListModel.delete,
      find: ListModel.find
    };
    Object.entries(delegatedMethods).forEach(([method, delegate]) => {
      expect(Lists[method]).to.equal(delegate);
    });
  });

  describe('.all', () => {
    const userId = 'user-id';
    const lists = [{ list: 1 }, { list: 2 }];

    before(() => sinon.stub(ListModel, 'allBy').resolves(lists));
    after(() => ListModel.allBy.restore());

    it('gets all the lists by userId', async () => {
      const options = { some: 'options' };
      const res = await Lists.all(userId, options);
      expect(res).to.deep.equal(lists);
      expect(ListModel.allBy).to.have.been.calledWithExactly('userId', userId, options);
    });
  });

  describe('.allRecursive', () => {
    const userId = 'user-id';
    const lists = [{ list: 1 }, { list: 2 }];

    before(() => sinon.stub(ListModel, 'allBy').resolves(lists));
    after(() => ListModel.allBy.restore());

    it('gets all the lists by userId', async () => {
      const options = { some: 'options' };
      const expectedOptions = Object.assign({}, options, { recursive: true });
      const res = await Lists.allRecursive(userId, options);
      expect(res).to.deep.equal(lists);
      expect(ListModel.allBy).to.have.been.calledWithExactly('userId', userId, expectedOptions);
    });
  });

  describe('.updateImportStatus', () => {
    const listId = 'l-id';
    const userId = 'u-id';
    const timestamp = 4567;
    const importId = `${userId}.${listId}.${timestamp}`;
    const currentImport = { status: 'pending', createdAt: 1234 };
    const importStatus = { [timestamp]: currentImport };
    const list = { id: listId, userId, importStatus };

    before(() => {
      sinon.stub(ListModel, 'find').withArgs(userId, listId).resolves(list);
      sinon.stub(ListModel, 'update').resolves(true);
    });
    after(() => {
      ListModel.find.restore();
      ListModel.update.restore();
    });

    it('updates the list import status', async () => {
      const newImportFields = { status: 'success', finishedAt: 7890 };
      const updatedImportStatus = {
        [timestamp]: Object.assign({}, currentImport, newImportFields)
      };
      await Lists.updateImportStatus(userId, listId, importId, newImportFields);
      expect(ListModel.update).to.have.been.calledWithMatch({ importStatus: updatedImportStatus }, userId, listId);
    });
  });

  describe('.setImportingStarted', () => {
    const listId = 'l-id';
    const userId = 'u-id';
    const timestamp = 4567;
    const importId = `${userId}.${listId}.${timestamp}`;
    const currentImport = { status: 'pending', createdAt: 1234 };
    const importStatus = { [timestamp]: currentImport };
    const list = { id: listId, userId, importStatus, processing: false };

    before(() => {
      sinon.stub(Lists, 'updateImportStatus').resolves(true);
      sinon.stub(ListModel, 'update').resolves(true);
    });
    after(() => {
      Lists.updateImportStatus.restore();
      ListModel.update.restore();
    });

    it('sets the import as started', async () => {
      const res = await Lists.setImportingStarted(userId, listId, importId);
      expect(Lists.updateImportStatus).to.have.been.calledWithMatch(userId, listId, importId, { status: 'importing', createdAt: sinon.match.number });
      expect(ListModel.update).to.have.been.calledWithExactly({ processed: false }, userId, listId);
    });
  });

  describe('.setAsProcessed', () => {
    const listId = 'l-id';
    const userId = 'u-id';

    before(() => {
      sinon.stub(ListModel, 'update').resolves(true);
    });
    after(() => {
      ListModel.update.restore();
    });

    it('sets the import as started', async () => {
      const res = await Lists.setAsProcessed(userId, listId);
      expect(ListModel.update).to.have.been.calledWithExactly({ processed: true }, userId, listId);
    });
  });

  describe('.updateMetadataAttrsAndImportStatusFromEvents', () => {
    const listId = 'l-id';
    const userId = 'user-id';
    const aRecipient = {
      email: 'david.garcia@microapps.com',
      listId,
      userId,
      metadata: { surname: 'García' }
    };
    const anotherListId = 'another-l-id';
    const anotherRecipient = Object.assign(
      {},
      aRecipient,
      { listId: anotherListId, metadata: { country: 'ES' } }
    );
    const recipientImportedEvents = [
      { payload: { recipient: aRecipient, importId: 123, recipientIndex: 1, totalRecipients: 1 } },
      { payload: { recipient: anotherRecipient, importId: 456, recipientIndex: 1, totalRecipients: 1 } }
    ];

    beforeEach(() => {
      sinon.stub(Lists, 'updateImportStatus').resolves(true);
      sinon.stub(ListModel, 'appendMetadataAttributes').resolves(true);
    });
    afterEach(() => {
      Lists.updateImportStatus.restore();
      ListModel.appendMetadataAttributes.restore();
    });

    it('updates metadata attributes of the list', async () => {
      await Lists.updateMetadataAttrsAndImportStatusFromEvents(recipientImportedEvents);
      expect(ListModel.appendMetadataAttributes).to.have.been.calledTwice;
      expect(ListModel.appendMetadataAttributes)
        .to.have.been.calledWithExactly(Object.keys(aRecipient.metadata), { userId, listId });
      expect(ListModel.appendMetadataAttributes)
        .to.have.been.calledWithExactly(Object.keys(anotherRecipient.metadata), { userId, listId: anotherListId });
    });

    it('updates import status', async () => {
      await Lists.updateMetadataAttrsAndImportStatusFromEvents(recipientImportedEvents);
      expect(Lists.updateImportStatus).to.have.been.calledTwice;
      expect(Lists.updateImportStatus).to.have.been.calledWith(userId, listId, 123, { status: 'importing' });
      expect(Lists.updateImportStatus).to.have.been.calledWith(userId, anotherListId, 456, { status: 'importing' });
    });
  });
});
