import R from 'ramda';
import Api from './src/Api';

export function processSesNotification(snsEvent, context, callback) {
  const event = R.pipe(
    R.pathOr({}, ['Records', 0, 'Sns', 'Message']),
    JSON.parse
  )(snsEvent);
  return Api.processSesNotification(event)
    .then(() => callback(null, true))
    .catch(err => callback(err));
}
