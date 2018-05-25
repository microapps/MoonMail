'use strict';

import { DeliverScheduledCampaignsService } from '../lib/services/deliver_scheduled_campaigns_service';
import { debug } from '../../../lib/index';
import { SNS } from 'aws-sdk';

const sns = new SNS({region: process.env.SERVERLESS_REGION});

export function respond(event, cb) {
  debug('= sendScheduledCampaigns.action');
  const service = new DeliverScheduledCampaignsService(sns);
  return service.execute()
    .then(() => cb())
    .catch(err => cb(err));
}
