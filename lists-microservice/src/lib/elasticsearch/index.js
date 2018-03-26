import AWS from 'aws-sdk';
import AWSESConnection from 'http-aws-es';
import Elasticsearch from 'elasticsearch';
import App from '../../App';

let _esClient = null;

function getClient() {
  return _esClient || createClient({});
}

function awsCredentials() {
  return new AWS.EnvironmentCredentials('AWS');
}

function getDocument(indexName, indexType, id, esClient = null) {
  const client = esClient || getClient();
  return client.get({
    index: indexName,
    type: indexType,
    id
  });
}

function deleteDocument(indexName, indexType, id, esClient = null) {
  const client = esClient || getClient();
  return client.delete({
    index: indexName,
    type: indexType,
    id
  });
}

function createOrUpdateDocument(indexName, indexType, id, item, esClient = null) {
  const client = esClient || getClient();

  return client.index({
    index: indexName,
    type: indexType,
    id,
    body: item
  });
}

function update(indexName, indexType, id, body, esClient = null) {
  const client = esClient || getClient();

  return client.update({
    index: indexName,
    type: indexType,
    id,
    body
  });
}

function search(indexName, indexType, queryBody, esClient = null) {
  const client = esClient || getClient();

  const esQueryRequest = {
    index: indexName,
    type: indexType,
    body: queryBody
  };
  App.logger().debug('ElasticSearch.search', JSON.stringify(esQueryRequest));
  return client.search(esQueryRequest);
}

function createClient({ credentials = awsCredentials(), elasticSearchHost = process.env.ES_HOST, elasticSearchRegion = process.env.ES_REGION }) {
  if (!_esClient) {
    const options = {
      hosts: [elasticSearchHost],
      connectionClass: AWSESConnection,
      awsConfig: new AWS.Config({ region: elasticSearchRegion })
    };
    if (process.env.NODE_ENV === 'test') {
      _esClient = new Elasticsearch.Client({
        host: process.env.ES_HOST
        // log: {
        //   level: 'trace'
        // }
      });
    } else {
      _esClient = new Elasticsearch.Client(options);
    }
  }
  return _esClient;
}

export default {
  createOrUpdateDocument,
  getDocument,
  deleteDocument,
  update,
  search,
  getClient
};
