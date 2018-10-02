import R from 'ramda';
import Api from './src/Api';

const getKinesisPayload = R.path(['kinesis', 'data']);
const decodeBase64String = R.partialRight(Buffer.from, ['base64']);
const parseBase64Json = R.pipe(decodeBase64String, JSON.parse);
const deserializeKinesisEvent = R.pipe(getKinesisPayload, parseBase64Json);

export function processEmailNotifications(kinesisStream, context, callback) {
  const events = R.pipe(
    R.prop('Records'),
    R.map(deserializeKinesisEvent)
  )(kinesisStream);
  return Api.processEmailNotifications(events)
    .then(() => callback(null, true))
    .catch(err => callback(err));
}
