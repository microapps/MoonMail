'use strict';

import { debug } from '../../lib/logger';
import decrypt, { getUserContext } from '../../lib/auth-token-decryptor';
import { Campaign } from 'moonmail-models';
import { DeliverCampaignService } from '../../lib/services/deliver_campaign_service';
import { ApiErrors } from '../../lib/errors';

export function respond(event, cb) {
  debug('= scheduleCampaign.action', JSON.stringify(event));
  decrypt(event.authToken)
    .then(decoded => getUserContext(decoded.sub))
    .then((user) => {
      if (event.campaignId && event.scheduleAt) {
        const userId = user.id;
        const userPlan = user.plan;
        const deliverService = new DeliverCampaignService(null, { campaignId: event.campaignId, user });
        deliverService.checkUserQuota()
          .then(() => Campaign.schedule(userId, event.campaignId, event.scheduleAt))
          .then(res => cb(null, res))
          .catch(err => cb(ApiErrors.response(err)));
      } else {
        return cb(ApiErrors.response('Missing params'));
      }
    })
    .catch(err => cb(ApiErrors.response(err), null));
}
