import { Kinesis } from 'aws-sdk';

const kinesisClient = new Kinesis({ region: process.env.REGION });
const getClient = () => kinesisClient;
const buildKinesisPutRecordsParams = function buildKinesisPutRecordsParams(events, streamName, eventType) {
  const records = events.map(evt => ({ Data: JSON.stringify(evt), PartitionKey: eventType }));
  return {
    Records: records,
    StreamName: streamName
  };
};
const refineResult = function refineKinesisResult(events, subscription, kinesisResult) {
  const records = kinesisResult.Records.map((record, index) => {
    const baseResult = { event: events[index], subscription };
    return record.ErrorCode
      ? Object.assign({}, baseResult, { error: record.ErrorMessage, errorCode: record.ErrorCode })
      : baseResult;
  });
  return { records };
};
const refineError = function refineKinesisError(events, subscription, error = {}) {
  const records = events.map(event => ({ event, subscription, error: error.message }));
  return { records };
};
const publishBatch = function publishEventsBatch(events, subscription) {
  const client = KinesisNotifier.getClient();
  const params = buildKinesisPutRecordsParams(events, subscription.subscribedResource, subscription.type);
  return client.putRecords(params).promise()
    .then(result => refineResult(events, subscription, result))
    .catch(err => refineError(events, subscription, err));
};

const KinesisNotifier = {
  getClient,
  publishBatch
};

export default KinesisNotifier;
