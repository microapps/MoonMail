import R from 'ramda';
import Api from './src/Api';
import ApiGatewayUtils from './src/lib/utils/ApiGatewayUtils';

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
  console.log(JSON.stringify(event));
  const { linkUrl } = R.prop('queryStringParameters', event);
  // return ApiGatewayUtils.redirectTo({ url: linkUrl, callback });
  return callback(null, ApiGatewayUtils.buildResponse({ body: event }));
}
