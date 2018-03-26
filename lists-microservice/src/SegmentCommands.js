import App from './App';
import Api from './Api';

function createSegment(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('createSegment', JSON.stringify(event));
  return Api.createSegment(event.segment)
    .then(segment => callback(null, segment))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function updateSegment(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('updateSegment', JSON.stringify(event));
  return Api.updateSegment(event.segment, event.listId, event.segmentId)
    .then(segment => callback(null, segment))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function deleteSegment(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('deleteSegment', JSON.stringify(event));
  return Api.deleteSegment(event.listId, event.segmentId)
    .then(() => callback(null, {}))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

export default {
  createSegment,
  updateSegment,
  deleteSegment
};

const c = {
  listId: '1',
  name: 'some-name',
  userId: 'user-id',
  conditionMatch: 'all',
  conditions: [
    {
      // Match recipients who received all the last 5 campaings
      conditionType: 'campaignActivity',
      condition: {
        queryType: 'received',
        fieldToQuery: 'count',
        searchTerm: 5,
        match: 'all'
      }
    },
    // Match recipients who clicked any of the campaigns in a date range
    {
      conditionType: 'campaignActivity',
      condition: {
        queryType: 'clicked',
        fieldToQuery: 'time',
        searchTerm: { gte: 12313123213, lte: 12313123213 }, // it's possible to omit one of the gte or lte
        match: 'all'
      }
    }
  ]
};

