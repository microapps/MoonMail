import omitEmpty from 'omit-empty';
import BuildCampaignActivityQuerySection from './BuildCampaignActivitySegmentSection';
import Promise from 'bluebird';
import campaignActivityEsQuery from './campaignActivityEsQuery';
import wait from '../../lib/utils/wait';

function buildSegmentQuery(listId, conditions, campaignActivityEsQueryFn = campaignActivityEsQuery) {
  return prepareContext(listId, conditions, campaignActivityEsQueryFn)
    .then(enrichedConditions => createSegmentFilters(listId, enrichedConditions));
}

// {
//   "bool" : {
//      "must" :     [], // ANDs (Query scope)
//      "should" :   [], // ORs (Query scope)
//      "must_not" : [], // NOTs (Query scope)
//      "filter":    []  // (Filter scope) Filters: currently supports AND operations between all filters
//   }
// }

// Note that to perform term queries we need to access the .keyword field instead of the raw one
// For more details visit https://www.elastic.co/guide/en/elasticsearch/reference/5.3/multi-fields.html
function createSegmentFilters(listId, conditions) {
  const mergeUnique = (left, right) => Array.from(new Set([...(left || []), ...(right || [])]));

  const filterConditions = conditions
    .filter(conditionObject => conditionObject.conditionType === 'filter')
    .reduce((aggregatedBody, nextCondition) => {
      // Deprecating match queries in favor of term ones,
      // the later is faster and meant to filter without analyzing
      const queryType = nextCondition.condition.queryType.replace('match', 'term');
      const fieldToQuery = queryType.match(/term(s)?/) ? `${nextCondition.condition.fieldToQuery}.keyword` : nextCondition.condition.fieldToQuery;
      const filterFragment = {
        [queryType]: {
          [fieldToQuery]: nextCondition.condition.searchTerm
        }
      };
      aggregatedBody.filter.push(filterFragment);
      return aggregatedBody;
    }, { filter: [] });


  // concat conditions with ANDs for now, in the future we should use
  // `conditionMatch` in ListSegment
  const campaignActivityConditions = conditions.filter(conditionObject => conditionObject.conditionType === 'campaignActivity')
    .reduce((aggregatedBody, nextCondition) => {
      const queryFragment = BuildCampaignActivityQuerySection.build(nextCondition.campaignIds, nextCondition.condition);
      aggregatedBody.must.push(queryFragment.must);
      aggregatedBody.should.push(queryFragment.should);
      aggregatedBody.filter.push(queryFragment.filter);
      aggregatedBody.must_not.push(queryFragment.must_not);
      return aggregatedBody;
    }, { filter: [], should: [], must: [], must_not: [] });

  return omitEmpty({
    query: {
      bool: {
        must: mergeUnique(...campaignActivityConditions.must, filterConditions.must),
        should: mergeUnique(...campaignActivityConditions.should, filterConditions.should),
        filter: mergeUnique(...campaignActivityConditions.filter, filterConditions.filter),
        must_not: mergeUnique(...campaignActivityConditions.must_not, filterConditions.must_not)
      }
    }
  });
}

function prepareContext(listId, conditions, campaignActivityEsQueryFn) {
  return Promise.map(conditions, (conditionWrapper) => {
    if (conditionWrapper.conditionType === 'campaignActivity') {
      return campaignActivityEsQueryFn(listId, conditionWrapper.condition.fieldToQuery, conditionWrapper.condition.searchTerm)
        .then((campaignIds) => {
          if (campaignIds.length === 0) return Promise.reject(new Error('NoCampaignsSent'));
          if (conditionWrapper.condition.match === 'all' && conditionWrapper.condition.fieldToQuery === 'count' && conditionWrapper.condition.searchTerm !== campaignIds.length) {
            return Promise.reject(new Error('NotEnoughActivityToMatchAllCountCondition'));
          }
          return { ...conditionWrapper, campaignIds };
        });
    }
    return conditionWrapper;
  }, { concurrency: 1 });
}

export default {
  create: buildSegmentQuery
};
