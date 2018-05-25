import omitEmpty from 'omit-empty';
import moment from 'moment';
import Promise from 'bluebird';
import AWS from 'aws-sdk';
import { logger } from '../../../lib/index';
import { paramsChecker, errorHandler } from '../../lib/api-utils';

export default function respond(event, cb) {
  logger().info('= getEndpointRepStats.action', JSON.stringify(event));
  const checkParams = paramsChecker(['key', 'secret', 'region']);
  return checkParams(omitEmpty(event))
    .then(decoded => getStats(event.key, event.secret, event.region))
    .then(stats => cb(null, stats))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}

function getBounceRateStats(client, startDate, endDate, period) {
  return client.getMetricStatistics({
    Namespace: 'AWS/SES',
    MetricName: 'Reputation.BounceRate',
    StartTime: startDate,
    EndTime: endDate,
    Period: period,
    Statistics: ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum']
  }).promise();
}

function getComplaintRateStats(client, startDate, endDate, period) {
  return client.getMetricStatistics({
    Namespace: 'AWS/SES',
    MetricName: 'Reputation.ComplaintRate',
    StartTime: startDate,
    EndTime: endDate,
    Period: period,
    Statistics: ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum']
  }).promise();
}

function getStats(accessKey, accessSecret, region) {
  const client = new AWS.CloudWatch({
    accessKeyId: accessKey,
    secretAccessKey: accessSecret,
    region
  });
  const startDate = moment().subtract(5, 'days').startOf('day').unix();
  const endDate = moment().unix();
  const period = 3600;
  return Promise.props({
    bounceRate: getBounceRateStats(client, startDate, endDate, period),
    complaintRate: getComplaintRateStats(client, startDate, endDate, period)
  }).then((results) => {
    return {
      bounceRate: results.bounceRate
        .Datapoints.sort((a, b) => (moment(a.Timestamp) - moment(b.Timestamp)))
        .map(dp => dp.Average),
      complaintRate: results.complaintRate
        .Datapoints.sort((a, b) => (moment(a.Timestamp) - moment(b.Timestamp)))
        .map(dp => dp.Average)
    };
  });
}
