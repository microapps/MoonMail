import Promise from 'bluebird';
import { debug } from '../../../../lib/index';
import { User } from '../../../../lib/models/user';
import decrypt from '../../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../../lib/errors';
import { SenderDecoratorService } from '../lib/sender_decorator_service';

export function respond(event, cb) {
  debug('= listSenders.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    const userId = decoded.sub;
    let filter = (sender) => sender

    if(event.filters.archived) filter = (sender) => sender.archived.toString() === event.filters.archived

    User.listSenders(userId)
      .then(senders => cb(null, { items: senders.items.filter(filter) }))
      .catch(err => cb(ApiErrors.response(err)));
  }).catch(err => cb(ApiErrors.response(err), null));
}

function decorateSenders(userId, senders) {
  return Promise.resolve(senders);
  // return Promise.map(senders.items,
  //   sender => SenderDecoratorService.provideDomainDkimSpfStatuses(userId, sender),
  //   { concurrency: 1 });
}
