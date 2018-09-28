import * as aws from 'aws-sdk';
import { logger } from '../../lib/index';
import { PrecompileEmailService } from '../../lib/precompile_email_service';

aws.config.update({ region: process.env.SERVERLESS_REGION });
const sqs = new aws.SQS();

module.exports.respond = (event, cb) => {
  logger().info('= sender.precompileEmail', JSON.stringify(event));
  console.log(JSON.stringify(event))
  const emailParams = JSON.parse(event.Records[0].Sns.Message);
  const precompileService = new PrecompileEmailService(sqs, emailParams);
  precompileService.enqueueEmail()
    .then((result) => cb(null, result))
    .catch((e) => { console.log('error', e); cb() });
};
