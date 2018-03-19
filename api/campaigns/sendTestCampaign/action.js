import * as AWS from 'aws-sdk';
import { debug } from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';

AWS.config.region = process.env.SERVERLESS_REGION || 'us-east-1';
const sns = new AWS.SNS();

export function respond(event, cb) {
  debug('= createCampaign.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    if (event.campaign && event.sender) {
      const params = {
        Message: JSON.stringify(event),
        TopicArn: process.env.PRECOMPILE_CAMPAIGN_TOPIC_ARN
      };
      sns.publish(params, (err, data) => {
        if (err) {
          debug('= sendTestCampaign.action', 'Error sending message', err);
          cb(ApiErrors.response(err));
        } else {
          debug('= sendTestCampaign.action', 'Message sent');
          cb(null, data);
        }
      });
    } else {
      return cb('No campaign specified');
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
