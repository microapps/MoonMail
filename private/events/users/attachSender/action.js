import * as aws from 'aws-sdk';
import { debug } from '../../../lib/index';
import Senders from '../../../lib/senders/index';
import { parse } from 'aws-event-parser';

aws.config.update({ region: process.env.SERVERLESS_REGION });
const snsClient = new aws.SNS();

export default function respond(event, cb) {
  debug('= attachSender.action', JSON.stringify(event));
  const attachSenderMessage = parse(event)[0];
  Senders.attachSender(snsClient, attachSenderMessage)
    .then(data => cb(null, data))
    .catch(err => cb(err));
}
