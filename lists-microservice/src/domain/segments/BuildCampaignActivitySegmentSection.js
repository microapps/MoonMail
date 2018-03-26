import ElasticSearch from '../../lib/elasticsearch';

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

const byTimeOrAnyFilterTemplate = (searchType, searchTerm) => {
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
    ...byTimeOrAnyFilterTemplate(fieldToQuery, searchTerm)
  ]
});

const matchingAllNegativeEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => {
  const baseConditions = {
    filter: [
      ...byTimeOrAnyFilterTemplate(fieldToQuery, searchTerm)
    ],
    must_not: [
      ...allCampaignsMatchingFilterTemplate(campaignIds, eventType)
    ]
  };
  if (eventType.match(/opened|clicked/)) {
    baseConditions.filter.push(...allCampaignsMatchingFilterTemplate(campaignIds, 'received'));
  }
  return baseConditions;
};

const matchingAnyPossitiveEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => ({
  filter: [
    // ...eventTypeFilterTemplate(eventType),
    ...anyCampaignsMatchingFilterTemplate(campaignIds, eventType),
    ...byTimeOrAnyFilterTemplate(fieldToQuery, searchTerm)
  ]
});

const matchingAnyNegativeEventsQueryBuilder = ({ eventType, campaignIds, fieldToQuery, searchTerm }) => {
  const baseConditions = {
    filter: [
      ...byTimeOrAnyFilterTemplate(fieldToQuery, searchTerm)
    ],
    must_not: [
      // ...eventTypeFilterTemplate(eventType),
      ...anyCampaignsMatchingFilterTemplate(campaignIds, eventType)
    ]
  };
  if (eventType.match(/opened|clicked/)) {
    baseConditions.filter.push(...anyCampaignsMatchingFilterTemplate(campaignIds, 'received'));
  }

  return baseConditions;
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
  'any:not_received': matchingAnyNegativeEventsQueryBuilder,
  'any:not_opened': matchingAnyNegativeEventsQueryBuilder,
  'any:not_clicked': matchingAnyNegativeEventsQueryBuilder
};

export default {
  build: buildCampaignActivityQuerySection
};
