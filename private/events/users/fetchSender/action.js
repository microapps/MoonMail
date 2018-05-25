import Senders from '../../../lib/senders/index';

export function respond(event, cb) {
  return Senders.fetchSender(event.userId, event.senderId)
    .then(sender => cb(null, sender))
    .catch(() => cb(null, {}));
}
