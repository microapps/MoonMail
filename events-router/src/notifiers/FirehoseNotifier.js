import { Firehose } from 'aws-sdk';

const firehoseClient = new Firehose({ region: process.env.REGION });
const getClient = () => firehoseClient;
const buildFirehosePutRecordBatchParams = function buildFirehosePutRecordBatchParams(events, deliveryStreamName, eventType) {
  const records = events.map(evt => ({ Data: JSON.stringify(evt) }));
  return {
    Records: records,
    DeliveryStreamName: deliveryStreamName
  };
};
const refineResult = function refineFirehoseResult(events, subscription, kinesisResult) {
  const responses = kinesisResult.RequestResponses.map((response, index) => {
    const baseResult = { event: events[index], subscription };
    return response.ErrorCode
      ? Object.assign({}, baseResult, { error: response.ErrorMessage, errorCode: response.ErrorCode })
      : baseResult;
  });
  return { records: responses };
};
const publishBatch = function publishEventsBatch(events, subscription) {
  const client = FirehoseNotifier.getClient();
  const params = buildFirehosePutRecordBatchParams(events, subscription.subscribedResource, subscription.type);
  return client.putRecordBatch(params).promise()
    .then(result => refineResult(events, subscription, result));
};

const FirehoseNotifier = {
  getClient,
  publishBatch
};

export default FirehoseNotifier;
