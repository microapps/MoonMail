import { Firehose } from 'aws-sdk';

const firehorseClient = new Firehose({ region: process.env.REGION });
const getClient = () => firehorseClient;
const buildFirehorsePutRecordBatchParams = function buildFirehorsePutRecordBatchParams(events, deliveryStreamName, eventType) {
  const records = events.map(evt => ({ Data: JSON.stringify(evt) }));
  return {
    Records: records,
    DeliveryStreamName: deliveryStreamName
  };
};
const refineResult = function refineFirehorseResult(events, subscription, kinesisResult) {
  const responses = kinesisResult.RequestResponses.map((response, index) => {
    const baseResult = { event: events[index], subscription };
    return response.ErrorCode
      ? Object.assign({}, baseResult, { error: response.ErrorMessage, errorCode: response.ErrorCode })
      : baseResult;
  });
  return { records: responses };
};
const publishBatch = function publishEventsBatch(events, subscription) {
  const client = FirehorseNotifier.getClient();
  const params = buildFirehorsePutRecordBatchParams(events, subscription.subscribedResource, subscription.type);
  return client.putRecordBatch(params).promise()
    .then(result => refineResult(events, subscription, result));
};

const FirehorseNotifier = {
  getClient,
  publishBatch
};

export default FirehorseNotifier;
