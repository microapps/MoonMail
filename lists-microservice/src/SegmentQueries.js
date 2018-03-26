import omitEmpty from 'omit-empty';
import App from './App';
import Api from './Api';


function listSegments(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('listSegments', JSON.stringify(event));
  const options = event.options || {};
  return Api.listSegments(event.listId, options)
    .then(segments => callback(null, segments))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function listSegmentMembers(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('listSegmentMembers', JSON.stringify(event));
  const options = event.options || {};
  return Api.getSegmentMembers(event.listId, event.segmentId, omitEmpty(options))
    .then(members => callback(null, members))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function getSegment(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('getSegment', JSON.stringify(event));
  return Api.getSegment(event.listId, event.segmentId)
    .then(segment => callback(null, segment))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

export default {
  getSegment,
  listSegmentMembers,
  listSegments
};
