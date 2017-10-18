import { ListSegment, List, Recipient } from 'moonmail-models';
import ElasticSearch from '../elasticsearch';

function validRecipient(recipient) {
  return !!recipient.listId && !!recipient.id && !!recipient.createdAt && !!recipient.email;
}

const Recipients = {
  indexName: process.env.ES_RECIPIENTS_INDEX_NAME,
  indexType: process.env.ES_RECIPIENTS_INDEX_TYPE,
  client: ElasticSearch.createClient({}),

  //
  // Queries
  //
  listFilterCondition: listId => ({ condition: { queryType: 'match', fieldToQuery: 'listId', searchTerm: listId }, conditionType: 'filter' }),
  subscribedCondition: () => ({ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: 'subscribed' }, conditionType: 'filter' }),

  defaultESConditions(listId) {
    return [this.listFilterCondition(listId)];
  },

  buildESId(recipient) {
    return `${recipient.listId}-${recipient.id}`;
  },

  searchRecipientsByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
    return this.searchRecipientsByConditions([...conditions, ...this.defaultESConditions(listId)], { from, size });
  },

  searchRecipientsByConditions(conditions, { from = 0, size = 10 }) {
    return ListSegment.validateConditions(conditions)
      .then(conditions => ElasticSearch.buildQueryFilters(conditions).from(from).size(size))
      .then(query => ElasticSearch.search(this.client, this.indexName, this.indexType, query.build()))
      .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
  },

  // TODO: migrate to ES
  totalRecipients(userId) {
    return List.allBy('userId', userId)
      .then(lists => lists.items.filter(l => (!!l.subscribedCount && !l.archived)).reduce((accum, next) => (accum + next.subscribedCount), 0));
  },

  // TODO: migrate to ES
  getRecipient(listId, recipientId) {
    return Recipient.get(listId, recipientId);
  },

  //
  // Commands
  //
  createESRecipient(id, recipient) {
    if (!validRecipient(recipient)) return Promise.resolve();
    const newRecipient = Object.assign({}, recipient, { metadata: stringifyMetadata(recipient.metadata) });
    return ElasticSearch.createOrUpdateDocument(this.client, this.indexName, this.indexType, id, newRecipient);
  },

  updateESRecipient(id, newRecipient) {
    if (!validRecipient(newRecipient)) return Promise.resolve();
    const recipient = Object.assign({}, newRecipient, { metadata: stringifyMetadata(newRecipient.metadata) });
    return ElasticSearch.createOrUpdateDocument(this.client, this.indexName, this.indexType, id, recipient);
  },


  deleteESRecipient(id) {
    return ElasticSearch.deleteDocument(this.client, this.indexName, this.indexType, id).catch(Promise.resolve);
  },

  updateRecipient(data, listId, recipientId) {
    return Recipient.update(data, listId, recipientId);
  }
};

function stringifyMetadata(metadata) {
  if (!metadata) return {};
  return Object.keys(metadata).reduce((acum, key) => {
    acum[key] = metadata[key].toString();
    return acum;
  }, {});
}

export default Recipients;
