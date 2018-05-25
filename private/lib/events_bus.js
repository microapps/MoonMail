import AWS from 'aws-sdk';

let _busClient;

const busClient = () => {
  if (!_busClient) _busClient = new AWS.SNS({region: process.env.SERVERLESS_REGION});
  return _busClient;
};

const publish = (type, payload) => {
  const eventsBusTopicArn = process.env.EVENTS_BUS_TOPIC_ARN;
  const event = {type, payload};
  const params = {
    Message: JSON.stringify(event),
    TopicArn: eventsBusTopicArn
  };
  return busClient().publish(params).promise();
};

export default {
  publish
};
