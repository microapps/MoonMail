import '../../lib/specHelper';
import ElasticSearch from '../elasticsearch';

const dummyEsClient = {
  index() { },
  search() { },
  delete() { }
};

describe('ElasticSearch', () => {
  describe('.createOrUpdateDocument', () => {
    before(() => sinon.stub(dummyEsClient, 'index').resolves());
    after(() => dummyEsClient.index.restore());

    it('performs a proper index for the given input', async () => {
      await ElasticSearch.createOrUpdateDocument('my-index', 'my-index-type', 'my-id', { id: 1 }, dummyEsClient);
      expect(dummyEsClient.index).to.be.called;
    });
  });

  describe('.deleteDocument', () => {
    before(() => sinon.stub(dummyEsClient, 'delete').resolves());
    after(() => dummyEsClient.delete.restore());

    it('performs a proper delete for the given input', async () => {
      await ElasticSearch.deleteDocument('my-index', 'my-index-type', 'my-id', dummyEsClient);
      expect(dummyEsClient.delete).to.be.called;
    });
  });

  describe('.search', () => {
    before(() => sinon.stub(dummyEsClient, 'search').resolves());
    after(() => dummyEsClient.search.restore());

    it('performs a proper delete for the given input', async () => {
      await ElasticSearch.search('my-index', 'my-index-type', 'my-query', dummyEsClient);
      expect(dummyEsClient.search).to.be.called;
    });
  });
});
