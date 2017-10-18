import { ListSegment, List, Recipient } from 'moonmail-models';
import ElasticSearch from '../ElasticSearch';

function validRecipient(recipient) {
  return !!recipient.listId && !!recipient.id && !!recipient.createdAt && !!recipient.email;
}

function stringifyMetadata(metadata) {
  if (!metadata) return {};
  return Object.keys(metadata).reduce((acum, key) => {
    acum[key] = metadata[key].toString();
    return acum;
  }, {});
}

const Recipients = {
  config: {
    indexName: process.env.ES_RECIPIENTS_INDEX_NAME,
    indexType: process.env.ES_RECIPIENTS_INDEX_TYPE,


    listFilterCondition: listId => ({ condition: { queryType: 'match', fieldToQuery: 'listId', searchTerm: listId }, conditionType: 'filter' }),
    subscribedCondition: () => ({ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: 'subscribed' }, conditionType: 'filter' }),
    defaultESConditions: listId => [this.listFilterCondition(listId)]
  },

  createRecipient(recipient) {
    return Recipient.save(recipient);
  },

  updateRecipient(listId, recipientId, data) {
    return Recipient.update(data, listId, recipientId);
  },

  cloneRecipientToES(recipient) {
    if (!validRecipient(recipient)) return Promise.reject('Invalid Recipient'); // Fixme: Validation in mm.
    const recipientToSave = Object.assign({}, recipient, { metadata: stringifyMetadata(recipient.metadata) });
    return ElasticSearch.createOrUpdateDocument(this.config.indexName, this.config.indexType, this.buildESId(recipientToSave), recipientToSave);
  },

  getRecipient(listId, recipientId) {
    return Recipient.get(listId, recipientId);
  },

  listRecipients() {
    // TODO later, to be updated from https://github.com/microapps/MoonMail/pull/234
  },

  countRecipients(userId) {
    return List.allBy('userId', userId)
      .then(lists => lists.items.filter(l => (!!l.subscribedCount && !l.archived)).reduce((accum, next) => (accum + next.subscribedCount), 0));
  },

  searchRecipientsByConditions(conditions, { from = 0, size = 10 }) {
    return ListSegment.validateConditions(conditions)
      .then(conditions => ElasticSearch.buildQueryFilters(conditions).from(from).size(size))
      .then(query => ElasticSearch.search(this.indexName, this.indexType, query.build()))
      .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
  },

  searchRecipientsByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
    return this.searchRecipientsByConditions([...conditions, ...this.defaultESConditions(listId)], { from, size });
  },

  buildESId(recipient) {
    return `${recipient.listId}-${recipient.id}`;
  }
};

export default Recipients;
