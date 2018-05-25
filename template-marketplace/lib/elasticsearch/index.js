import AWS from 'aws-sdk';
import AWSESConnection from 'http-aws-es';
import Elasticsearch from 'elasticsearch';
import bodyBuilder from 'bodybuilder';
import { logger } from '../logger';

function awsCredentials() {
  return new AWS.EnvironmentCredentials('AWS');
}

const ElasticSearch = {
  deleteDocument(esClient, indexName, indexType, id) {
    return esClient.delete({
      index: indexName,
      type: indexType,
      id
    });
  },

  createOrUpdateDocument(esClient, indexName, indexType, id, item) {
    const indexParams = {
      index: indexName,
      type: indexType,
      id,
      body: item
    };
    logger().debug(JSON.stringify(indexParams));
    return esClient.index(indexParams);
  },

  search(esClient, indexName, indexType, queryBody) {
    const esQueryRequest = {
      index: indexName,
      type: indexType,
      body: queryBody
    };
    logger().debug(JSON.stringify(esQueryRequest));
    return esClient.search(esQueryRequest);
  },

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
  buildQueryFilters(conditions) {
    return conditions
      .filter(conditionObject => conditionObject.conditionType === 'filter') // we only support must queries for now
      .reduce((aggregatedBody, nextCondition) => {
        const fieldToQuery = nextCondition.condition.queryType.match(/term/) ? `${nextCondition.condition.fieldToQuery}.keyword` : nextCondition.condition.fieldToQuery;
        return aggregatedBody.filter(nextCondition.condition.queryType, fieldToQuery, nextCondition.condition.searchTerm);
      }, bodyBuilder());
  },

  createClient({ credentials = awsCredentials(), elasticSearchHost = process.env.ES_HOST, elasticSearchRegion = process.env.ES_REGION }) {
    return new Elasticsearch.Client({
      hosts: elasticSearchHost,
      connectionClass: AWSESConnection,
      amazonES: {
        region: elasticSearchRegion,
        credentials
      }
    });
  }
};

export default ElasticSearch;
