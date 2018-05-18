import Joi from 'joi';
import moment from 'moment';
import omitEmpty from 'omit-empty';
import ElasticSearch from '../lib/elasticsearch';
import RecipientModel from './RecipientModel';
import SegmentEsQuery from './segments/SegmentEsQuery';
import ListSegmentModel from './ListSegmentModel';

const indexName = process.env.ES_RECIPIENTS_INDEX_NAME;
const indexType = process.env.ES_RECIPIENTS_INDEX_TYPE;

const listFilterCondition = listId => ({ condition: { queryType: 'match', fieldToQuery: 'listId', searchTerm: listId }, conditionType: 'filter' });
const subscribedCondition = () => ({ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: 'subscribed' }, conditionType: 'filter' });
const defaultConditions = listId => [listFilterCondition(listId)];

const createSchema = Joi.object({
  listId: Joi.string().required(),
  userId: Joi.string().required(),
  id: Joi.string().required(),
  email: Joi.string().regex(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).required(),
  subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)).required(),
  isConfirmed: Joi.boolean(),
  status: Joi.string().valid(Object.values(RecipientModel.statuses)).required(),
  riskScore: Joi.number(),
  metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
  systemMetadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
  campaignActivity: Joi.array().default([]),
  unsubscribedAt: Joi.number(),
  subscribedAt: Joi.number(),
  unsubscribedCampaignId: Joi.string(),
  bouncedAt: Joi.number(),
  complainedAt: Joi.number(),
  createdAt: Joi.number(),
  updatedAt: Joi.number()
});

const updateSchema = Joi.object({
  listId: Joi.string().required(),
  userId: Joi.string().required(),
  id: Joi.string().required(),
  email: Joi.string().regex(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).required(),
  subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)).required(),
  isConfirmed: Joi.boolean(),
  status: Joi.string().valid(Object.values(RecipientModel.statuses)).required(),
  riskScore: Joi.number(),
  metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
  systemMetadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
  unsubscribedAt: Joi.number(),
  subscribedAt: Joi.number(),
  unsubscribedCampaignId: Joi.string(),
  bouncedAt: Joi.number(),
  complainedAt: Joi.number(),
  createdAt: Joi.number(),
  updatedAt: Joi.number()
});

function create(recipient) {
  const esId = RecipientModel.buildGlobalId({ recipient });
  return RecipientModel.validate(createSchema, omitEmpty(recipient), { allowUnknown: true })
    .then(newRecipient => ElasticSearch.createOrUpdateDocument(indexName, indexType, esId, newRecipient));
}

function update(recipient) {
  const esId = RecipientModel.buildGlobalId({ recipient });
  return RecipientModel.validate(updateSchema, omitEmpty(recipient), { allowUnknown: true })
    .then(newRecipient => ElasticSearch.createOrUpdateDocument(indexName, indexType, esId, newRecipient));
}

function remove(id) {
  return ElasticSearch.deleteDocument(indexName, indexType, id);
}

function find({ listId, recipientId }) {
  return ElasticSearch.getDocument(indexName, indexType, RecipientModel.buildGlobalId({ listId, recipientId }))
    .then(result => result._source);
}

function searchSubscribedByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
  return searchByListAndConditions(listId, [...conditions, subscribedCondition()], { from, size });
}

function searchByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
  return searchByConditions(listId, [...conditions, ...defaultConditions(listId)], { from, size });
}

function searchByConditions(listId, conditions, { from = 0, size = 10 }) {
  return Joi.validate(conditions, ListSegmentModel.conditionsSchema)
    .then(validConditions => SegmentEsQuery.create(listId, validConditions))
    .then(query => Object.assign({}, query, { from, size }))
    .then(queryWithPagination => ElasticSearch.search(indexName, indexType, queryWithPagination))
    .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }))
    .catch((error) => {
      console.error('searchByConditions Error ocurred', error);
      if (error.message.match(/NoCampaignsSent/)) return { items: [], total: 0, message: error.message };
      if (error.message.match(/NotEnoughActivityToMatchAllCountCondition/)) return { items: [], total: 0 };
      return Promise.reject(error);
    });
}

function buildEsQuery({ q, status, listId, from = 0, size = 10 }) {
  const filters = [
    status ? { terms: { 'status.keyword': [].concat.apply([], [status]) } } : null,
    listId ? { term: { 'listId.keyword': listId } } : null
  ].filter(f => !!f);

  const fullTextSearch = q ? [
    // { multi_match: { query: q, fuzziness: 'AUTO', fields: ['name', 'email', 'companyName'] } },
    { multi_match: { query: q, type: 'phrase', fields: ['email', 'metadata.name', 'metadata.surname'] } },
    { multi_match: { query: q, type: 'phrase_prefix', fields: ['email', 'metadata.name', 'metadata.surname'] } }
  ] : [];
  const queryTemplate = {
    from,
    size,
    query: {
      bool: {
        // -> This part declares the fulltext search part
        // must:
        // [{
        //  bool: {
        //     should: fullTextSearch
        //  }
        // }],

        // -> This part declares the filters
        // filter: filters
      }
    }
  };
  if (fullTextSearch.length > 0) queryTemplate.query.bool.must = [{ bool: { should: fullTextSearch } }];
  if (filters.length > 0) queryTemplate.query.bool.filter = filters;
  if (fullTextSearch.length === 0 && filters.length === 0) {
    delete queryTemplate.query.bool;
    queryTemplate.query = {
      match_all: {}
    };
  }
  return queryTemplate;
}

function search({ q, status, listId, from = 0, size = 10 }) {
  const query = buildEsQuery({ q, status, listId, from, size });
  return Promise.resolve(query)
    .then(esQuery => ElasticSearch.search(indexName, indexType, esQuery))
    .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
}

function undeliverableRecipients({ listId, from = 0, size = 10 }) {
  return search({ status: [RecipientModel.statuses.bounced, RecipientModel.statuses.complaint, RecipientModel.statuses.unsubscribed], listId, from, size });
}

export default {
  find,
  create,
  update,
  remove,
  // Useful for segments matching
  // TODO: We probably want to change this to use buildESQuery
  searchByListAndConditions,
  searchSubscribedByListAndConditions,
  buildEsQuery,
  search,
  undeliverableRecipients
};

