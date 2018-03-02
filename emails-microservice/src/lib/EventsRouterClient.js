import AWS from 'aws-sdk';

function buildKinesisParams(partitionKey, streamName, payload) {
  if (Object.keys(payload).length === 0) return Promise.resolve({});
  return {
    Data: JSON.stringify(payload),
    PartitionKey: partitionKey,
    StreamName: streamName
  };
}

function publishKinesisEvent(partitionKey, streamName, payload, kinesisClient = null) {
  const params = buildKinesisParams(partitionKey, streamName, payload);
  const client = kinesisClient || new AWS.Kinesis({ region: process.env.REGION });
  return client.putRecord(params).promise();
}

function write({ topic, payload, client }) {
  const streamName = process.env.EVENTS_ROUTER_STREAM_NAME;
  return publishKinesisEvent(topic, streamName, payload, client);
}

export default {
  write
};
