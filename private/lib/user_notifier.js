import aws from 'aws-sdk';

aws.config.update({region: process.env.SERVERLESS_REGION});
const iot = new aws.IotData({endpoint: process.env.IOT_ENDPOINT || 'endpoint'});

export default class UserNotifier {
  static notify(topic, payload) {
    const params = {topic, payload: JSON.stringify(payload)};
    return iot.publish(params).promise();
  }
}
