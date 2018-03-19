import R from 'ramda';
import base64url from 'base64-url';
import Api from './src/Api';
import ApiGatewayUtils from './src/lib/utils/ApiGatewayUtils';

const renameKeys = R.curry((keysMap, obj) =>
  R.reduce((acc, key) => R.assoc(keysMap[key] || key, obj[key], acc), {}, R.keys(obj)));
const addHttpsIfNoProtocol = function addHttpsToUrl(url) {
  let uri = url;
  if (!/^(?:f|ht)tps?\:\/\//.test(uri)) {
    uri = `https://${uri}`;
  }
  return uri;
};

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
  const url = R.pipe(
    R.pathOr('https://moonmail.io', ['queryStringParameters', 'url']),
    decodeURIComponent,
    addHttpsIfNoProtocol
  )(event);
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
    .then(() => ApiGatewayUtils.redirectTo({ url, callback }))
    .catch(() => ApiGatewayUtils.redirectTo({ url, callback }));
}

export function persistLinkClick(snsEvent, context, callback) {
  const event = R.pipe(
    R.pathOr({}, ['Records', 0, 'Sns', 'Message']),
    JSON.parse
  )(snsEvent);
  return Api.persistLinkClick(event.payload)
    .then(() => callback(null, true))
    .catch(err => callback(err));
}
