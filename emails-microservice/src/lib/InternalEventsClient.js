import AWS from 'aws-sdk';

function publishToSnsTopic(event, topicArn, snsClient = null) {
  const client = snsClient || new AWS.SNS();
  const params = {
    Message: JSON.stringify(event),
    TopicArn: topicArn
  };
  return client.publish(params).promise();
}

function publish({ event, client }) {
  const eventTopicMapping = {
    'email.link.clicked': process.env.EMAIL_EVENT_TOPIC_ARN,
    'email.opened': process.env.EMAIL_EVENT_TOPIC_ARN
  };
  const topicArn = eventTopicMapping[event.type];
  return publishToSnsTopic(event, topicArn, client);
}

export default {
  publish
};
