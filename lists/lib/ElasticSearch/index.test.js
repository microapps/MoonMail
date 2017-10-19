import '../specHelper';
import ElasticSearch from '../elasticsearch';

const dummyEsClient = {
  index() { },
  search() { },
  delete() { }
}
describe('ElasticSearch', () => {
  describe('#buildQueryBuilders', () => {
    const conditions = [
      { condition: { queryType: 'match', fieldToQuery: 'subscriberOrigin', searchTerm: 'signupForm' }, conditionType: 'filter' },
      { condition: { queryType: 'range', fieldToQuery: 'createdAt', searchTerm: { gte: 'now-30d/d' } }, conditionType: 'filter' }
    ];

    it('builds the query using the conditions', () => {
      const query = ElasticSearch.buildQueryFilters(conditions).build();
      expect(query).to.deep.equals({ query: { bool: { filter: { bool: { must: [{ match: { subscriberOrigin: 'signupForm' } }, { range: { createdAt: { gte: 'now-30d/d' } } }] } } } } });
    });
  });

  describe('#createOrUpdateDocument', () => {
    before(() => sinon.stub(dummyEsClient, 'index').resolves());
    after(() => dummyEsClient.index.restore());

    it('performs a proper index for the given input', async () => {
      await ElasticSearch.createOrUpdateDocument('my-index', 'my-index-type', 'my-id', { id: 1 }, dummyEsClient);
      expect(dummyEsClient.index).to.be.called;
    });
  });

  describe('#deleteDocument', () => {
    before(() => sinon.stub(dummyEsClient, 'delete').resolves());
    after(() => dummyEsClient.delete.restore());

    it('performs a proper delete for the given input', async () => {
      await ElasticSearch.deleteDocument('my-index', 'my-index-type', 'my-id', dummyEsClient);
      expect(dummyEsClient.delete).to.be.called;
    });
  });

  describe('#search', () => {
    before(() => sinon.stub(dummyEsClient, 'search').resolves());
    after(() => dummyEsClient.search.restore());

    it('performs a proper delete for the given input', async () => {
      await ElasticSearch.search('my-index', 'my-index-type', 'my-query', dummyEsClient);
      expect(dummyEsClient.search).to.be.called;
    });
  });
});
