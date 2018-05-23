import '../../lib/specHelper';
import BuildCampaignActivitySegmentSection from './BuildCampaignActivitySegmentSection';

describe('BuildCampaignActivitySegmentSection', () => {
  describe('.build', () => {
    const cases = [
      // campaignActivity
      {
        input: { queryType: 'received', fieldToQuery: 'time', searchTerm: { gte: 'now-30d/d' }, match: 'any' },
        expected: {
          filter: [
            {
              nested: {
                path: 'campaignActivity',
                query: {
                  bool: {
                    filter: [
                      { term: { 'campaignActivity.event.keyword': 'received' } },
                      { terms: { 'campaignActivity.campaignId.keyword': ['12', '123', '1234'] } }
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
            }
          ]
        }
      },
      {
        input: { queryType: 'opened', fieldToQuery: 'count', searchTerm: 5, match: 'all' },
        expected: {
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
            {
              nested: {
                path: 'campaignActivity',
                query: {
                  bool: {
                    filter: [
                      { term: { 'campaignActivity.campaignId.keyword': '1234' } },
                      { term: { 'campaignActivity.event.keyword': 'opened' } }
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      {
        input: { queryType: 'clicked', fieldToQuery: 'count', searchTerm: 5, match: 'any' },
        expected: {
          filter: [
            {
              nested: {
                path: 'campaignActivity',
                query: {
                  bool: {
                    filter: [
                      { term: { 'campaignActivity.event.keyword': 'clicked' } },
                      { terms: { 'campaignActivity.campaignId.keyword': ['12', '123', '1234'] } }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
      // {
      //   input: { queryType: 'not_received', fieldToQuery: 'time', searchTerm: { gte: 'now-30d/d' }, match: 'any' },
      //   expected: {
      //     should: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { range: { 'campaignActivity.timestamp': { gte: 'now-30d/d' } } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ],
      //     must_not: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.event.keyword': 'received' } },
      //                 { terms: { 'campaignActivity.campaignId.keyword': ['12', '123', '1234'] } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ]
      //   }
      // }
      // {
      //   input: { queryType: 'not_opened', fieldToQuery: 'count', searchTerm: 5, match: 'all' },
      //   expected: {
      //     filter: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '12' } },
      //                 { term: { 'campaignActivity.event.keyword': 'received' } }
      //               ]
      //             }
      //           }
      //         }
      //       },
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '123' } },
      //                 { term: { 'campaignActivity.event.keyword': 'received' } }
      //               ]
      //             }
      //           }
      //         }
      //       },
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '1234' } },
      //                 { term: { 'campaignActivity.event.keyword': 'received' } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ],
      //     must_not: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '12' } },
      //                 { term: { 'campaignActivity.event.keyword': 'opened' } }
      //               ]
      //             }
      //           }
      //         }
      //       },
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '123' } },
      //                 { term: { 'campaignActivity.event.keyword': 'opened' } }
      //               ]
      //             }
      //           }
      //         }
      //       },
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.campaignId.keyword': '1234' } },
      //                 { term: { 'campaignActivity.event.keyword': 'opened' } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ]
      //   }
      // }
      // {
      //   input: { queryType: 'not_clicked', fieldToQuery: 'count', searchTerm: 5, match: 'any' },
      //   expected: {
      //     filter: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.event.keyword': 'received' } },
      //                 { terms: { 'campaignActivity.campaignId.keyword': ['12', '123', '1234'] } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ],
      //     must_not: [
      //       {
      //         nested: {
      //           path: 'campaignActivity',
      //           query: {
      //             bool: {
      //               filter: [
      //                 { term: { 'campaignActivity.event.keyword': 'clicked' } },
      //                 { terms: { 'campaignActivity.campaignId.keyword': ['12', '123', '1234'] } }
      //               ]
      //             }
      //           }
      //         }
      //       }
      //     ]
      //   }
      // }
    ];

    it('builds the query sections for all the cases', () => {
      cases.forEach((c) => {
        const condition = c.input;
        const query = BuildCampaignActivitySegmentSection.build(['12', '123', '1234'], condition);
        expect(query).to.deep.equals(c.expected);
      });
    });
  });
});
