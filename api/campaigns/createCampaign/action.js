import { Campaign } from 'moonmail-models';
import { debug } from '../../lib/logger';
import cuid from 'cuid';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';

export function respond(event, cb) {
  debug('= createCampaign.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    if(decoded.sub === 'google-oauth2|113947278021199221588') throw 'Sorry, the demo account is not allowed to perform this action' //demo account
    if (event.campaign) {
      let campaign = event.campaign;
      campaign.userId = decoded.sub;
      campaign.id = cuid();
      campaign.status = 'draft';
      Campaign.save(campaign).then(() => {
        return cb(null, campaign);
      }).catch(e => {
        debug(e);
        return cb(ApiErrors.response(e));
      });
    } else {
      return cb(ApiErrors.response('No campaign specified'));
    }
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
