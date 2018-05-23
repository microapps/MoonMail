import ElasticSearch from '../../lib/elasticsearch';
import omitEmpty from 'omit-empty';

function buildCampaignActivityQuerySection(campaignIds, condition) {
  const namedTemplate = `${condition.match}:${condition.queryType}`;
  const buildSection = campaignActivitySegmentsQueryMapping[namedTemplate];
  if (!buildSection) throw new Error(`Condition ${JSON.stringify(condition)} seems to be unsupported`);
  return buildSection({ eventType: condition.queryType, campaignIds, fieldToQuery: condition.fieldToQuery, searchTerm: condition.searchTerm });
}

const nested = subQuery => ({
  nested: {
    path: 'campaignActivity',
    query: {
      bool: subQuery
    }
  }
});

const allCampaignsMatchingFilterTemplate = (campaignIds, eventType) => {
  const [cleanedEventType] = eventType.split('_').slice(-1);
  return campaignIds.map(campaignId => (
    nested({
      filter: [
        {
          term: {
            'campaignActivity.campaignId.keyword': campaignId
          }
        },
        {
          term: {
            'campaignActivity.event.keyword': cleanedEventType
          }
        }
      ]
    })
  ));
};

const allCampaignsMatchingWithTimeFilterTemplate = (campaignIds, eventType, fieldToQuery, searchTerm) => {
  const [cleanedEventType] = eventType.split('_').slice(-1);
  return campaignIds.map(campaignId => (
    nested({
      filter: [
        {
          term: {
            'campaignActivity.campaignId.keyword': campaignId
          }
        },
        {
          term: {
            'campaignActivity.event.keyword': cleanedEventType
          }
        },
        {
          range: {
            'campaignActivity.timestamp': searchTerm
          }
        }
      ]
    })
  ));
};

const anyCampaignsMatchingFilterTemplate = (campaignIds, eventType) => {
  const [cleanedEventType] = eventType.split('_').slice(-1);
  return [
    nested({
      filter: [
        {
          term: {
            'campaignActivity.event.keyword': cleanedEventType
          }
        },
        {
          terms: {
            'campaignActivity.campaignId.keyword': [...campaignIds]
          }
        }
      ]
    })
  ];
};

const anyCampaignsMatchingNegativeFilterTemplate = (campaignIds, eventType) => {
  const [cleanedEventType] = eventType.split('_').slice(-1);
  const campaignFilters = campaignIds.map(campaignId => ({
    term: {
      'campaignActivity.campaignId.keyword': campaignId
    }
  }));
  return [
    nested({
      filter: [
        {
          term: {
            'campaignActivity.event.keyword': cleanedEventType
          }
        },
        ...campaignFilters
      ]
    })
  ];
};

const byTimeFilterTemplate = (searchType, searchTerm) => {
  if (searchType === 'time') {
    return [
      nested({
        filter: [
          {
            range: {
              'campaignActivity.timestamp': searchTerm
            }
          }
        ]
      })
    ];
  }
  return [];
};

const eventTypeFilterTemplate = (eventType) => {
  const [cleanedEventType] = eventType.split('_').slice(-1);
  return [
    nested({
      filter: [
        {
          term: {
            'campaignActivity.event.keyword': cleanedEventType
          }
        }
      ]
    })
  ];
};

const matchingAllPositiveEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => ({
  filter: [
    // ...eventTypeFilterTemplate(eventType),
    ...allCampaignsMatchingFilterTemplate(campaignIds, eventType),
    ...byTimeFilterTemplate(fieldToQuery, searchTerm)
  ]
});

const matchingAllNegativeEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => {
  const baseConditions = {
    filter: [],
    should: [
      ...byTimeFilterTemplate(fieldToQuery, searchTerm)
    ],
    must_not: [
      ...allCampaignsMatchingFilterTemplate(campaignIds, eventType)
    ]
  };
  if (eventType.match(/opened|clicked/)) {
    baseConditions.filter.push(...allCampaignsMatchingFilterTemplate(campaignIds, 'received'));
  }
  return omitEmpty(baseConditions);
};

const matchingAnyPossitiveEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => ({
  filter: [
    // ...eventTypeFilterTemplate(eventType),
    ...anyCampaignsMatchingFilterTemplate(campaignIds, eventType),
    ...byTimeFilterTemplate(fieldToQuery, searchTerm)
  ]
});

const matchingAnyNegativeReceivedEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => {
  const baseConditions = {
    filter: [
      {
        bool: {
          should: [
            {
              bool: {
                must_not: [
                  {
                    nested: {
                      path: 'campaignActivity',
                      query: {
                        bool: {
                          filter: {
                            exists: {
                              field: 'campaignActivity'
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            },
            ...(fieldToQuery === 'time' ? allCampaignsMatchingWithTimeFilterTemplate(campaignIds, eventType, fieldToQuery, searchTerm) : allCampaignsMatchingFilterTemplate(campaignIds, eventType))
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  ...allCampaignsMatchingFilterTemplate(campaignIds, eventType)
                ]
              }
            }
          ]
        }
      }

    ],
    should: [],
    must_not: []
  };

  return omitEmpty(baseConditions);
};

const matchingAnyNegativeOpenedOrClickedEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => {
  const baseConditions = {
    filter: [
      {
        bool: {
          should: [
            // ...allCampaignsMatchingFilterTemplate(campaignIds, eventType)
          ]
        }
      },
      ...byTimeFilterTemplate(fieldToQuery, searchTerm),
      ...allCampaignsMatchingFilterTemplate(campaignIds, 'received'),
      {
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  ...allCampaignsMatchingFilterTemplate(campaignIds, eventType)
                ]
              }
            }
          ]
        }
      }

    ],
    should: [],
    must_not: []
  };

  return omitEmpty(baseConditions);
};

const campaignActivitySegmentsQueryMapping = {
  'all:received': matchingAllPositiveEventsQueryBuilder,
  'all:opened': matchingAllPositiveEventsQueryBuilder,
  'all:clicked': matchingAllPositiveEventsQueryBuilder,
  'all:not_received': matchingAllNegativeEventsQueryBuilder,
  'all:not_opened': matchingAllNegativeEventsQueryBuilder,
  'all:not_clicked': matchingAllNegativeEventsQueryBuilder,
  'any:received': matchingAnyPossitiveEventsQueryBuilder,
  'any:opened': matchingAnyPossitiveEventsQueryBuilder,
  'any:clicked': matchingAnyPossitiveEventsQueryBuilder,
  'any:not_received': matchingAnyNegativeReceivedEventsQueryBuilder,
  'any:not_opened': matchingAnyNegativeOpenedOrClickedEventsQueryBuilder,
  'any:not_clicked': matchingAnyNegativeOpenedOrClickedEventsQueryBuilder
};

export default {
  build: buildCampaignActivityQuerySection
};
