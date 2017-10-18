import cuid from 'cuid';
import base64url from 'base64-url';
import { ListSegment } from 'moonmail-models';
import ElasticSearch from '../elasticsearch';
import Recipients from '../recipients/Recipients';

const Segments = {

  indexName: process.env.ES_RECIPIENTS_INDEX_NAME,
  indexType: process.env.ES_RECIPIENTS_INDEX_TYPE,
  client: ElasticSearch.createClient({}),

  listSubscribedMembers(segmentId, { from = 0, size = 10 }) {
    return this.getSegmentById(segmentId)
      .then(segment => Recipients.searchRecipientsByConditions([...segment.conditions, Recipients.subscribedCondition()], { from, size }));
  },

  listMembers(segmentId, { from = 0, size = 10 }) {
    return this.getSegmentById(segmentId)
      .then(segment => Recipients.searchRecipientsByConditions(segment.conditions, { from, size }));
  },

  getSegment(listId, id) {
    return ListSegment.get(listId, id)
      .then(segment => Object.assign({}, segment, { conditions: [...segment.conditions, Recipients.listFilterCondition(listId)] }));
  },

  getSegmentById(segmentId) {
    return ListSegment.getBySegmentId(segmentId)
      .then(segment => Object.assign({}, segment, { conditions: [...segment.conditions, Recipients.listFilterCondition(segment.listId)] }));
  },

  createSegment(segment) {
    const segmentToSave = Object.assign({}, { id: cuid() }, segment);
    return ListSegment.save(segmentToSave).then(() => segmentToSave);
  },

  updateSegment(newSegment, listId, id) {
    return ListSegment.update(newSegment, listId, id);
  },

  listSegments(listId, options = {}) {
    return ListSegment.allBy('listId', listId, Object.assign({}, { limit: 250 }, Object.assign({}, { filters: { archived: { ne: true } } }, options)));
  },

  archiveSegment(listId, id) {
    return this.updateSegment({ archived: true }, listId, id);
  },

  unArchiveSegment(listId, id) {
    return this.updateSegment({ archived: false }, listId, id);
  }
};

export default Segments;
