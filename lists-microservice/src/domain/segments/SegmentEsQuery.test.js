import Promise from 'bluebird';
import '../../lib/specHelper';
import SegmentEsQuery from './SegmentEsQuery';

describe('SegmentEsQuery', () => {
  describe('.createSegmentFilters', () => {
    const cases = [
      {
        input: [
          // filter conditions
          { condition: { queryType: 'match', fieldToQuery: 'subscriberOrigin', searchTerm: 'signupForm' }, conditionType: 'filter' },
          { condition: { queryType: 'term', fieldToQuery: 'systemMetadata.country', searchTerm: 'ES' }, conditionType: 'filter' },
          { condition: { queryType: 'terms', fieldToQuery: 'status', searchTerm: ['bounced', 'complaint'] }, conditionType: 'filter' },
          { condition: { queryType: 'range', fieldToQuery: 'createdAt', searchTerm: { gte: 'now-30d/d' } }, conditionType: 'filter' },

          // campaign activity conditions
          { condition: { queryType: 'received', fieldToQuery: 'time', searchTerm: { gte: 'now-30d/d' }, match: 'any' }, conditionType: 'campaignActivity' }
        ],
        expected: {
          query: {
            bool: {
              filter: [
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'campaignActivity.event.keyword': 'received' } },
                          { terms: { 'campaignActivity.campaignId.keyword': ['12', '123'] } }
                        ]
                      }
                    }
                  }
                },
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { range: { 'campaignActivity.timestamp': { gte: 'now-30d/d' } } }
                        ]
                      }
                    }
                  }
                },
                { term: { 'subscriberOrigin.keyword': 'signupForm' } },
                { term: { 'systemMetadata.country.keyword': 'ES' } },
                { terms: { 'status.keyword': ['bounced', 'complaint'] } },
                { range: { createdAt: { gte: 'now-30d/d' } } }]
            }
          }
        }
      },
      {
        input: [
          // filter conditions
          { condition: { queryType: 'match', fieldToQuery: 'subscriberOrigin', searchTerm: 'signupForm' }, conditionType: 'filter' },
          { condition: { queryType: 'term', fieldToQuery: 'systemMetadata.country', searchTerm: 'ES' }, conditionType: 'filter' },
          { condition: { queryType: 'terms', fieldToQuery: 'status', searchTerm: ['bounced', 'complaint'] }, conditionType: 'filter' },
          { condition: { queryType: 'range', fieldToQuery: 'createdAt', searchTerm: { gte: 'now-30d/d' } }, conditionType: 'filter' },

          // campaign activity conditions
          { condition: { queryType: 'opened', fieldToQuery: 'count', searchTerm: 2, match: 'all' }, conditionType: 'campaignActivity' }
        ],
        expected: {
          query: {
            bool:
              {
                filter: [
                  {
                    nested: {
                      path: 'campaignActivity',
                      query: {
                        bool: {
                          filter: [
                            { term: { 'campaignActivity.campaignId.keyword': '12' } },
                            { term: { 'campaignActivity.event.keyword': 'opened' } }
                          ]
                        }
                      }
                    }
                  },
                  {
                    nested: {
                      path: 'campaignActivity',
                      query: {
                        bool: {
                          filter: [
                            { term: { 'campaignActivity.campaignId.keyword': '123' } },
                            { term: { 'campaignActivity.event.keyword': 'opened' } }
                          ]
                        }
                      }
                    }
                  },
                  { term: { 'subscriberOrigin.keyword': 'signupForm' } },
                  { term: { 'systemMetadata.country.keyword': 'ES' } },
                  { terms: { 'status.keyword': ['bounced', 'complaint'] } },
                  { range: { createdAt: { gte: 'now-30d/d' } } }
                ]
              }
          }
        }
      },
      {
        input: [
          // filter conditions
          { condition: { queryType: 'match', fieldToQuery: 'subscriberOrigin', searchTerm: 'signupForm' }, conditionType: 'filter' },
          { condition: { queryType: 'term', fieldToQuery: 'systemMetadata.country', searchTerm: 'ES' }, conditionType: 'filter' },
          { condition: { queryType: 'terms', fieldToQuery: 'status', searchTerm: ['bounced', 'complaint'] }, conditionType: 'filter' },
          { condition: { queryType: 'range', fieldToQuery: 'createdAt', searchTerm: { gte: 'now-30d/d' } }, conditionType: 'filter' },

          // campaign activity conditions
          { condition: { queryType: 'not_opened', fieldToQuery: 'count', searchTerm: 2, match: 'all' }, conditionType: 'campaignActivity' }
        ],
        expected: {
          query: {
            bool: {
              filter: [
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'campaignActivity.campaignId.keyword': '12' } },
                          { term: { 'campaignActivity.event.keyword': 'received' } }
                        ]
                      }
                    }
                  }
                },
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'campaignActivity.campaignId.keyword': '123' } },
                          { term: { 'campaignActivity.event.keyword': 'received' } }
                        ]
                      }
                    }
                  }
                },
                { term: { 'subscriberOrigin.keyword': 'signupForm' } },
                { term: { 'systemMetadata.country.keyword': 'ES' } },
                { terms: { 'status.keyword': ['bounced', 'complaint'] } },
                { range: { createdAt: { gte: 'now-30d/d' } } }
              ],
              must_not: [
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'campaignActivity.campaignId.keyword': '12' } },
                          { term: { 'campaignActivity.event.keyword': 'opened' } }
                        ]
                      }
                    }
                  }
                },
                {
                  nested: {
                    path: 'campaignActivity',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'campaignActivity.campaignId.keyword': '123' } },
                          { term: { 'campaignActivity.event.keyword': 'opened' } }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    ];

    it('builds the query using the conditions', async () => {
      const campaignActivityResolver = (queryType, params) => Promise.resolve(['12', '123']);
      const listId = 'list-id';
      await Promise.map(cases, (c) => {
        const conditions = c.input;
        return SegmentEsQuery.create(listId, conditions, campaignActivityResolver)
          .then((query) => {
            expect(query).to.deep.equals(c.expected);
          });
      }, { concurrency: 1 });
    });
  });
});
