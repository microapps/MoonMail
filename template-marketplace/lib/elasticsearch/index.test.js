import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ElasticSearch from '../elasticsearch/index';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ElasticSearch', () => {
  describe('#buildFilters', () => {
    const conditions = [
      { condition: { queryType: 'match', fieldToQuery: 'subscriberOrigin', searchTerm: 'signupForm' }, conditionType: 'filter' },
      { condition: { queryType: 'range', fieldToQuery: 'createdAt', searchTerm: { gte: 'now-30d/d' } }, conditionType: 'filter' }
    ];

    it('builds the query using the conditions', () => {
      const query = ElasticSearch.buildQueryFilters(conditions).build();
      expect(query).to.deep.equals({ query: { bool: { filter: { bool: { must: [{ match: { subscriberOrigin: 'signupForm' } }, { range: { createdAt: { gte: 'now-30d/d' } } }] } } } } });
    });
  });
});
