import { strip } from 'eskimo-stripper';
import request from 'request-promise';
import omitEmpty from 'omit-empty';
import base64url from 'base64-url';
import moment from 'moment';
import { List, ListSegment, Recipient } from 'moonmail-models';
import ElasticSearch from '../elasticsearch/index';

function validRecipient(recipient) {
  return !!recipient.listId && !!recipient.id && !!recipient.createdAt && !!recipient.email;
}

function findDetectedDevice(metadata) {
  if (metadata['CloudFront-Is-Desktop-Viewer'] === 'true') { return 'desktop'; }
  if (metadata['CloudFront-Is-Mobile-Viewer'] === 'true') { return 'mobile'; }
  if (metadata['CloudFront-Is-SmartTV-Viewer'] === 'true') { return 'smartTv'; }
  if (metadata['CloudFront-Is-Tablet-Viewer'] === 'true') { return 'tablet'; }
  return 'unknown';
}

function stringifyMetadata(metadata) {
  if (!metadata) return {};
  return Object.keys(metadata).reduce((acum, key) => {
    acum[key] = metadata[key].toString();
    return acum;
  }, {});
}

const buildCompoundQuery = (queryParams) => {
  const filters = [
    queryParams.status ? { terms: { 'status.keyword': [].concat.apply([], [queryParams.status]) } } : null,
    queryParams.listId ? { term: { 'listId.keyword': queryParams.listId } } : null
  ].filter(q => !!q);

  const fullTextSearch = queryParams.q ? [
    // { multi_match: { query: queryParams.q, fuzziness: 'AUTO', fields: ['name', 'email', 'companyName'] } },
    { multi_match: { query: queryParams.q, type: 'phrase', fields: ['email', 'metadata.name', 'metadata.surname'] } },
    { multi_match: { query: queryParams.q, type: 'phrase_prefix', fields: ['email', 'metadata.name', 'metadata.surname'] } }
  ] : [];
  const queryTemplate = {
    from: queryParams.from,
    size: queryParams.size,
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
};


const Recipients = {
  indexName: process.env.ES_RECIPIENTS_INDEX_NAME,
  indexType: process.env.ES_RECIPIENTS_INDEX_TYPE,
  client: ElasticSearch.createClient({}),

  listFilterCondition: listId => ({ condition: { queryType: 'match', fieldToQuery: 'listId', searchTerm: listId }, conditionType: 'filter' }),
  subscribedCondition: () => ({ condition: { queryType: 'match', fieldToQuery: 'status', searchTerm: 'subscribed' }, conditionType: 'filter' }),
  defaultConditions(listId) {
    return [this.listFilterCondition(listId)];
  },

  buildESId(recipient) {
    return `${recipient.listId}-${recipient.id}`;
  },

  createESRecipient(id, recipient) {
    if (!validRecipient(recipient)) return Promise.resolve();
    const newRecipient = Object.assign({}, newRecipient, { metadata: stringifyMetadata(recipient.metadata) });
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

  searchRecipientsByListAndConditions(listId, conditions, { from = 0, size = 10 }) {
    return this.searchRecipientsByConditions([...conditions, ...this.defaultConditions(listId)], { from, size });
  },

  searchRecipientsByConditions(conditions, { from = 0, size = 10 }) {
    return ListSegment.validateConditions(conditions)
      .then(conditions => ElasticSearch.buildQueryFilters(conditions).from(from).size(size))
      .then(query => ElasticSearch.search(this.client, this.indexName, this.indexType, query.build()))
      .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
  },

  listRecipients(queryOptions, { from = 0, size = 10 }) {
    const query = buildCompoundQuery(Object.assign({}, queryOptions, { from, size }));
    return Promise.resolve(query)
      .then(query => ElasticSearch.search(this.client, this.indexName, this.indexType, query))
      .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
  },

  discoverFieldsFromRequestMetadata(requestMetadata) {
    const cfIpAddress = (requestMetadata['X-Forwarded-For'] || ',').split(',').shift().trim();
    const acceptLanguage = (requestMetadata['Accept-Language'] || ',').split(',').shift().trim();
    const language = (acceptLanguage || '_').split(/\-|_/).shift().trim();
    const updatedMetadata = omitEmpty({
      ip: cfIpAddress,
      countryCode: requestMetadata['CloudFront-Viewer-Country'],
      acceptLanguageHeader: requestMetadata['Accept-Language'],
      acceptLanguage,
      language,
      detectedDevice: findDetectedDevice(requestMetadata),
      userAgent: requestMetadata['User-Agent']
    });

    return request(`https://freegeoip.net/json/${cfIpAddress}`)
      .then(result => JSON.parse(result))
      .then(geoLocationData => omitEmpty(Object.assign({}, updatedMetadata, {
        countryName: geoLocationData.country_name,
        regionCode: geoLocationData.region_code,
        regionName: geoLocationData.region_name,
        city: geoLocationData.city,
        zipCode: geoLocationData.zip_code,
        timeZone: geoLocationData.time_zone,
        location: {
          lat: geoLocationData.latitude,
          lon: geoLocationData.longitude
        },
        metroCode: geoLocationData.metro_code
      })));
  },

  storeRecipientSystemMetadata(recipient, systemMetadata) {
    console.log('storeRecipientSystemMetadata', JSON.stringify(recipient), JSON.stringify(systemMetadata));
    if (systemMetadata.userAgent.match(/GoogleImageProxy/)) return Promise.resolve();
    return Recipient.update({ systemMetadata }, recipient.listId, recipient.id);
  },

  processOpenClickEventsStream(records) {
    return Promise.map(records, record => this.processOpenClickEvent(record), { concurrency: 2 });
  },

  processOpenClickEvent(record) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const item = strip(record.dynamodb.NewImage);
      if (!item.metadata || !item.listId || !item.recipientId) return Promise.resolve();
      const recipientId = item.recipientId;
      const listId = item.listId;
      // We are performing a get before the update before
      // somehow listId and recipientId sometimes point to non-existing recipients
      // on this way we can avoid errors instead of recovering from them on the update.
      return Recipient.get(listId, recipientId)
        .then((recipient) => {
          if (!recipient.id) return Promise.resolve();
          return this.discoverFieldsFromRequestMetadata(item.metadata)
            .then(newMetadata => this.storeRecipientSystemMetadata(recipient, newMetadata));
        });
    }
    return Promise.resolve();
  },

  // TODO: migrate to ES
  totalRecipients(userId) {
    return List.allBy('userId', userId, { recursive: true })
      .then(lists => lists.items.filter(l => (!!l.subscribedCount && !l.archived)).reduce((accum, next) => (accum + next.subscribedCount), 0));
  },

  syncRecipientStreamWithES(records) {
    return Promise.map(records, record => this.syncRecipientRecordWithES(record), { concurrency: 10 });
  },

  syncRecipientRecordWithES(record) {
    if (record.eventName === 'INSERT') {
      const item = strip(record.dynamodb.NewImage);
      return this.createESRecipient(this.buildESId(item), item);
    }
    if (record.eventName === 'MODIFY') {
      const item = strip(record.dynamodb.NewImage);
      return this.updateESRecipient(this.buildESId(item), item);
    }
    if (record.eventName === 'REMOVE') return this.deleteESRecipient(this.buildESId(strip(record.dynamodb.OldImage)));
  }
};

export default Recipients;
