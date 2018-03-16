import R from 'ramda';
import Api from './src/Api';
import base64url from 'base64-url';
import ApiGatewayUtils from './src/lib/utils/ApiGatewayUtils';

const renameKeys = R.curry((keysMap, obj) =>
  R.reduce((acc, key) => R.assoc(keysMap[key] || key, obj[key], acc), {}, R.keys(obj)));

export function processSesNotification(snsEvent, context, callback) {
  const event = R.pipe(
    R.pathOr({}, ['Records', 0, 'Sns', 'Message']),
    JSON.parse
  )(snsEvent);
  return Api.processSesNotification(event)
    .then(() => callback(null, true))
    .catch(err => callback(err));
}

export function processLinkClick(event, context, callback) {
  const { headers } = event;
  const linkClick = R.pipe(
    R.pick(['pathParameters', 'queryStringParameters']),
    R.values,
    R.mergeAll,
    R.pick(['campaignId', 'linkId', 'r', 'u', 'l', 's']),
    renameKeys({ r: 'recipientId', u: 'userId', l: 'listId', s: 'segmentId' }),
    R.evolve({ userId: base64url.decode }),
    R.merge({ httpHeaders: headers })
  )(event);
  return Api.processLinkClick(linkClick)
    .then(() => callback(null, true))
    .catch(err => callback(err));
}
