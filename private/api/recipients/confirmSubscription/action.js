import url from 'url';
import base64url from 'base64-url';
import { List } from 'moonmail-models';
import AWS from 'aws-sdk';
import omitEmpty from 'omit-empty';
import { ConfirmSubscriptionService } from '../lib/confirm_subscription_service';
import { logger } from '../../../lib/index';
import { paramsChecker } from '../../../lib/api-utils';
import EventsBus from '../../../lib/events_bus';

export function respond(event, cb) {
  logger().info('= confirmSubscription.action', JSON.stringify(event));
  const checkParams = paramsChecker(['listId', 'recipientId', 'verificationCode']);
  const userId = event.encodedUserId ? base64url.decode(event.encodedUserId) : null;
  return checkParams(omitEmpty(event))
  .then(() => confirmSubscription(event))
  .then(recipient => publishToKinesis({ event, recipient }))
  .then(recipient => successResponse({ recipient, userId, listId: event.listId }, cb))
  .catch(() => errorResponse({ userId, listId: event.listId }, cb));
}

function confirmSubscription(event) {
  logger().info('= confirmSubscription.confirmSubscription', JSON.stringify(event));
  const service = ConfirmSubscriptionService.create(event.listId, event.recipientId, event.verificationCode);
  return service.subscribe();
}

function successResponse({ recipient, userId, listId }, cb) {
  logger().info('= confirmSubscription.successResponse', recipient, userId, listId);
  return getRedirectUrls(userId, listId)
  .then((urls) => {
    const response = { url: urls.success };
    return EventsBus.publish('list.recipient.subscribe', { recipient })
    .then(() => cb(null, response))
    .catch(() => cb(null, response));
  });
}

const publishToKinesis = async ({ event, recipient }) => {
  const kinesis = new AWS.Kinesis({ region: process.env.SERVERLESS_REGION });
  logger().info('= confirmSubscription.publishToKinesis', JSON.stringify(event), JSON.stringify(recipient));
  const kinesisEvent = { type: `list.subscribed`, payload: { event: `subscribed`, item: `list`, itemId: event.listId, recipient: { id: recipient.id, email: recipient.email, listId: recipient.listId  } } }
  const kinesisParams = { Data: JSON.stringify(kinesisEvent), PartitionKey: kinesisEvent.type, StreamName: process.env.EVENTS_ROUTER_STREAM_NAME }
  await kinesis.putRecord(kinesisParams).promise()
  return recipient;
}

function errorResponse({ userId, listId }, cb) {
  logger().info('= confirmSubscription.errorResponse', userId, listId);
  return getRedirectUrls(userId, listId)
    .then(urls => cb(null, { url: urls.error }));
}


function getRedirectUrls(userId, listId) {
  const defaultUrls = {
    success: process.env.SUCCESS_PAGE,
    error: process.env.ERROR_PAGE
  };
  if (!userId || !listId) return Promise.resolve(defaultUrls);
  return List.get(userId, listId)
    .then((list) => {
      const customUrls = omitEmpty({
        success: list.successConfirmationUrl,
        error: list.errorConfirmationUrl
      });
      const urls = Object.assign({}, defaultUrls, customUrls);
      return {
        success: appendQueryStringData(urls.success, { listName: list.name }),
        error: appendQueryStringData(urls.error, { listName: list.name })
      };
    })
    .catch(() => defaultUrls);
}

function appendQueryStringData(baseUrl, data = {}) {
  return url.format(Object.assign({}, url.parse(baseUrl), omitEmpty({ query: data })));
}
