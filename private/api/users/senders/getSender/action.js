import Promise from 'bluebird';
import { debug } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { User } from '../../../../lib/models/user';
import { SenderDecoratorService } from '../lib/sender_decorator_service';

const fakeDemoResponse = {"domainVerified":true,"domainVerificationStatus":"Success","domainVerificationToken":"testtoken","dkimEnabled":true,"dkimVerified":true,"dkimVerificationStatus":"Success","dkimTokens":["testtoken2","testtoken3","testtoken4"],"spfEnabled":true,"dmarcEnabled":true,"verified":true,"fromName":"Howler Magazine","emailAddress":"hello@howlermagazine.com","id":"cital2isi000001p70980fgyt"}

export function respond(event, cb) {
  debug('= getSender.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    if(decoded.sub === 'google-oauth2|113947278021199221588'){ return cb(null, fakeDemoResponse) } //demo account
    const senderId = event.senderId;
    const userId = decoded.sub;
    if (senderId) {
      User.fetchSender(userId, senderId, true, false)
        .then(sender => SenderDecoratorService.getStatuses(userId, sender))
        .then(decoretedSender => cb(null, decoretedSender))
        .catch((e) => {
          debug('= getSender.action', e);
          return cb(ApiErrors.response(e));
        });
    } else {
      return cb(ApiErrors.response('No sender specified'));
    }
  }).catch(err => cb(ApiErrors.response(err), null));
}
