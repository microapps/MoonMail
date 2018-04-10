import { SQS } from 'aws-sdk';

const sqsClient = new SQS({ region: process.env.REGION });
const getClient = () => sqsClient;
const getQueueUrl = () => process.env.DEAD_LETTER_QUEUE_URL;
const buildSqsSendMessageParams = function buildSqsSendMessageParams(event, queueUrl) {
  return {
    MessageBody: JSON.stringify(event),
    QueueUrl: queueUrl
  };
};
const put = function putMessageInDeadLetterQueue(event) {
  const client = DeadLetterQueue.getClient();
  const queueUrl = getQueueUrl();
  const params = buildSqsSendMessageParams(event, queueUrl);
  return client.sendMessage(params).promise();
};

const DeadLetterQueue = {
  getClient,
  put
};

export default DeadLetterQueue;
