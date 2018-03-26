import ListSegmentModel from './ListSegmentModel';
import Recipients from './Recipients';

function create(item, validationOptions = {}) {
  return ListSegmentModel.create(item, validationOptions);
}

function update(item, listId, segmentId) {
  return ListSegmentModel.update(item, listId, segmentId);
}

function list(listId, options) {
  return ListSegmentModel.allBy('listId', listId, options);
}

function remove(listId, segmentId) {
  return ListSegmentModel.delete(listId, segmentId);
}

function getMembers(listId, segmentId, { from = 0, size = 10 }) {
  return ListSegmentModel.get(listId, segmentId)
    .then(segment => Recipients.searchSubscribedByListAndConditions(segment.listId, segment.conditions, { from, size }));
}

function get(listId, segmentId) {
  return ListSegmentModel.get(listId, segmentId);
}

export default {
  create,
  update,
  list,
  remove,
  getMembers,
  get
};
