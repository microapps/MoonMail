import { SNS } from 'aws-sdk';

const snsClient = new SNS({region: process.env.SERVERLESS_REGION});

class NotificationsBus {

  static publish(topic, message, subject) {
    const params = this._buildClientParams(topic, message, subject);
    return this._busClient.publish(params).promise()
      .then(() => message);
  }

  static get _topicsArnMapping() {
    const topics = {
      emailAdmins: process.env.EMAIL_ADMINS_TOPIC_ARN
    };
    return topics;
  }

  static get _busClient() {
    return snsClient;
  }

  static _buildClientParams(topic, message, subject) {
    const params = {
      TopicArn: this._topicsArnMapping[topic],
      Message: JSON.stringify(message),
      Subject: subject
    };
    return params;
  }
}

module.exports.NotificationsBus = NotificationsBus;
