import R from 'ramda';
import ElasticSearch from '../../lib/elasticsearch';


const queryMapping = {
  time: (listId, params) => ({
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'listId.keyword': listId
            }
          }
        ]
      }
    },
    aggregations: {
      campaigns: {
        nested: {
          path: 'campaignActivity'
        },
        aggregations: {
          timestampRange: {
            range: {
              field: 'campaignActivity.timestamp',
              ranges: [
                { from: params.gte, to: params.lte }
              ]
            },
            aggregations: {
              campaignIds: {
                terms: {
                  field: 'campaignActivity.campaignId.keyword',
                  size: 100
                }
              }
            }
          }
        }
      }
    }
  }),
  count: (listId, params) => ({
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'listId.keyword': listId
            }
          }
        ]
      }
    },
    aggregations: {
      campaigns: {
        nested: {
          path: 'campaignActivity'
        },
        aggregations: {
          campaignIds: {
            terms: {
              field: 'campaignActivity.campaignId.keyword',
              size: params,
              order: {
                maxDate: 'desc'
              }
            },
            aggregations: {
              maxDate: {
                max: {
                  field: 'campaignActivity.timestamp'
                }
              }
            }
          }
        }
      }
    }
  })
};

function campaignsByTimeOrCount(listId, queryType, params) {
  const indexName = process.env.ES_RECIPIENTS_INDEX_NAME;
  const indexType = process.env.ES_RECIPIENTS_INDEX_TYPE;
  const queryBuilder = queryMapping[queryType];
  const query = queryBuilder(listId, params);
  return ElasticSearch.search(indexName, indexType, query)
    .then((result) => {
      if (queryType === 'count') {
        const buckets = (((result.aggregations || {}).campaigns || {}).campaignIds || {}).buckets || [];
        return buckets.map(i => i.key);
      }
      const [firstTimeRangeBucket] = (((result.aggregations || {}).campaigns || {}).timestampRange || {}).buckets || [];
      const buckets = (firstTimeRangeBucket.campaignIds || {}).buckets || [];
      return buckets.map(i => i.key);

      // const extractCampaignIds = R.prop('key');
      // if (queryType === 'count') {
      //   const aggBuckets = R.pathOr([], ['aggregations', 'campaigns', 'campaignIds', 'buckets']);
      //   return R.pipe(aggBuckets, extractCampaignIds)(result);
      // }
      // const aggTimeRangeBuckets = R.pathOr([], ['aggregations', 'campaigns', 'timestampRange']);
      // const firstBucket = R.findIndex(0);
      // const aggBuckets = R.pathOr([], ['campaignIds', 'buckets']);
      // return R.pipe(aggTimeRangeBuckets, firstBucket, aggBuckets, extractCampaignIds)(result);
    });
}

export default campaignsByTimeOrCount;
