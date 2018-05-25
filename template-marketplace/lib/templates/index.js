import 'babel-polyfill';
import cuid from 'cuid';
import bodyBuilder from 'bodybuilder';
import { strip } from 'eskimo-stripper';
import ElasticSearch from '../elasticsearch/index';
import Template from './models/template';

const archivedCondition = archived => ({ condition: { queryType: 'match', fieldToQuery: 'archived', searchTerm: archived }, conditionType: 'filter' });
const approvedCondition = approved => ({ condition: { queryType: 'match', fieldToQuery: 'approved', searchTerm: approved }, conditionType: 'filter' });
const defaultConditions = [archivedCondition(false), approvedCondition(true)];


const esIndexName = process.env.ES_TEMPLATES_MARKETPLACE_INDEX_NAME;
const esIndexType = process.env.ES_TEMPLATES_MARKETPLACE_INDEX_TYPE;
const esClient = ElasticSearch.createClient({});

const buildCompoundQuery = (queryParams) => {
  const filters = [
    queryParams.category ? { terms: { 'categories.keyword': [].concat.apply([], [queryParams.category]) } } : null,
    queryParams.archived ? { match: { archived: queryParams.archived } } : { match: { archived: false } },
    queryParams.approved ? { match: { approved: queryParams.approved } } : { match: { approved: true } }
  ].filter(q => !!q);

  const fullTextSearch = queryParams.q ? [
    // { multi_match: { query: queryParams.q, fuzziness: 'AUTO', fields: ['name', 'email', 'companyName'] } },
    { multi_match: { query: queryParams.q, type: 'phrase', fields: ['name', 'tags', 'description'] } },
    { multi_match: { query: queryParams.q, type: 'phrase_prefix', fields: ['name', 'tags', 'description'] } }
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
  if (fullTextSearch.length === 0) {
    queryTemplate.sort = [
      { createdAt: { order: 'desc' } }
    ];
  }
  return queryTemplate;
};


const Templates = {

  createTemplate(template) {
    const templateToSave = Object.assign({}, { id: cuid(), approved: false, archived: false }, template);
    return Template.save(templateToSave)
      .then(result => templateToSave);
  },

  updateTemplate(newTemplate, id) {
    return Template.update(newTemplate, id);
  },

  archiveTemplate(id) {
    return this.updateTemplate({ archived: true }, id);
  },

  unArchiveTemplate(id) {
    return this.updateTemplate({ archived: false }, id);
  },

  getTemplate(id, options) {
    return Template.get(id, options);
  },

  listTemplates(queryOptions, { from = 0, size = 10 }) {
    const query = buildCompoundQuery(Object.assign({}, { from, size }, queryOptions));
    return Promise.resolve(query)
      .then(query => ElasticSearch.search(esClient, esIndexName, esIndexType, query))
      .then(esResult => ({ items: esResult.hits.hits.map(hit => hit._source), total: esResult.hits.total }));
  },

  createOrUpdateESTemplate(template) {
    return ElasticSearch.createOrUpdateDocument(esClient, esIndexName, esIndexType, template.id, template);
  },

  syncTemplatesStreamWithES(records) {
    return Promise.map(records, record => this.syncTemplateRecordWithES(record), { concurrency: 5 });
  },

  syncTemplateRecordWithES(record) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const item = strip(record.dynamodb.NewImage);
      return this.createOrUpdateESTemplate(item);
    }
  },

  getAllTags() {
    const query = bodyBuilder().aggregation('terms', 'tags.keyword').build();
    return ElasticSearch.search(esClient, esIndexName, esIndexType, query)
      .then(results => results.aggregations['agg_terms_tags.keyword'].buckets);
  }
};

export default Templates;
