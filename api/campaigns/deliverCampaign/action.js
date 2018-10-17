import * as aws from 'aws-sdk';
import { debug } from '../../lib/logger';
import decrypt, { getUserContext } from '../../lib/auth-token-decryptor';
import { DeliverCampaignService } from '../../lib/services/deliver_campaign_service';
import { ApiErrors } from '../../lib/errors';

aws.config.update({region: process.env.SERVERLESS_REGION});
const sns = new aws.SNS();

export function respond(event, cb) {
  debug('= deliverCampaign.action', JSON.stringify(event));
  decrypt(event.authToken)
    .then(decoded => {
      if(decoded.sub === 'google-oauth2|113947278021199221588') throw 'Sorry, the demo account is not allowed to perform this action' //demo account
      return decoded
    })
    .then(decoded => getUserContext(decoded.sub))
    .then(user => {
      debug('= deliverCampaign.action', 'Getting campaign', JSON.stringify(user));
      const deliverService = new DeliverCampaignService(sns, {campaign: event.campaign, campaignId: event.campaignId, user});
      deliverService.sendCampaign()
        .then(res => cb(null, res))
        .catch(err => cb(ApiErrors.response(err)));
    })
    .catch(err => cb(ApiErrors.response(err), null));
}
