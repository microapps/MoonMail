import '../../lib/specHelper';
import campaignActivityEsQuery from './campaignActivityEsQuery';
import ElasticSearch from '../../lib/elasticsearch';

describe('campaignActivityEsQuery', () => {
  context('time queries', () => {
    before(() => {
      sinon.stub(ElasticSearch, 'search').resolves({
        aggregations: {
          campaigns: {
            doc_count: 749199,
            timestampRange: {
              buckets: [
                {
                  key: '1.0-*',
                  from: 1,
                  doc_count: 749199,
                  campaignIds: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: '49859799-485a-41dc-af02-b5232d379f55',
                        doc_count: 150605
                      },
                      {
                        key: '23b76664-be0a-4609-bd98-f780c44bc091',
                        doc_count: 150452
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      });
    });

    after(() => {
      ElasticSearch.search.restore();
    });

    it('parses the results correctly', async () => {
      const listId = 'list-id';
      const result = await campaignActivityEsQuery(listId, 'time', { gte: 123123123213 });
      expect(result).to.exist;
    });
  });

  context('count queries', () => {
    before(() => {
      sinon.stub(ElasticSearch, 'search').resolves({
        aggregations: {
          campaigns: {
            doc_count: 749199,
            campaignIds: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '23b76664-be0a-4609-bd98-f780c44bc091',
                  doc_count: 150452,
                  maxDate: {
                    value: 1519362357
                  }
                },
                {
                  key: '39ea7efc-7faa-43db-99c0-637deefe6268',
                  doc_count: 148791,
                  maxDate: {
                    value: 1519362347
                  }
                }
              ]
            }
          }
        }
      });
    });
    after(() => {
      ElasticSearch.search.restore();
    });

    it('parses the results correctly', async () => {
      const listId = 'list-id';
      const result = await campaignActivityEsQuery(listId, 'count', 10);
      expect(result).to.exist;
    });
  });
});
