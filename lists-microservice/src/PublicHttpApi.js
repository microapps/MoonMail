import App from './App';
import Api from './Api';
import omitEmpty from 'omit-empty';
import UserContext from './lib/UserContext';
import Recipients from './domain/Recipients';
import HttpUtils from './lib/HttpUtils';
import RecipientModel from './domain/RecipientModel';

async function createRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('createRecipient', JSON.stringify(event));
    const { recipient } = JSON.parse(event.body);
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    await Api.publishRecipientCreatedEvent(omitEmpty({ listId: event.pathParameters.listId, userId: user.id, createRecipientPayload: recipient, subscriptionOrigin: RecipientModel.subscriptionOrigins.api }));
    const recipientId = Recipients.buildId(recipient);
    const recourceLocation = `/${event.pathParameters.listId}/recipients/${recipientId}`;
    HttpUtils.buildApiResponse({ statusCode: 202, headers: { Location: recourceLocation }, body: { recipient: { id: recipientId } } }, callback);
  } catch (error) {
    App.logger().error(error);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function updateRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('updateRecipient', JSON.stringify(event));
    const params = JSON.parse(event.body);
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    await Api.publishRecipientUpdatedEvent(omitEmpty({ listId: event.pathParameters.listId, userId: user.id, recipientId: event.pathParameters.recipientId, updateRecipientPayload: params }));
    HttpUtils.buildApiResponse({ statusCode: 202 }, callback);
  } catch (error) {
    App.logger().error(error);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function listRecipients(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('listRecipients', JSON.stringify(event));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const qs = event.queryStringParameters || {};
    const { listId } = event.pathParameters;
    const page = qs.page || 1;
    const limit = qs.limit || 10;
    const params = { q: qs.q, listId, status: qs.status, from: (page - 1) * limit, size: Math.min(limit, 100) };
    const recipients = await Api.searchRecipients(params);
    HttpUtils.buildApiResponse({ statusCode: 200, body: recipients }, callback);
  } catch (error) {
    App.logger().error(error, error.stack);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function getRecipient(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('getRecipient', JSON.stringify(event));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const recipient = await Api.getRecipient({ listId: event.pathParameters.listId, recipientId: event.pathParameters.recipientId });
    HttpUtils.buildApiResponse({ statusCode: 200, body: recipient }, callback);
  } catch (error) {
    App.logger().error(error, error.stack);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

async function getAllLists(event, context, callback) {
  try {
    App.configureLogger(event, context);
    App.logger().info('getAllLists', JSON.stringify(event));
    const user = await UserContext.byApiKey(event.requestContext.identity.apiKey);
    const qs = event.queryStringParam;
    const limit = 100;
    const options = { limit };
    const { items } = await Api.getAllLists(user.id, options);
    HttpUtils.buildApiResponse({ statusCode: 200, body: { items } }, callback);
  } catch (error) {
    App.logger().error(error, error.stack);
    HttpUtils.apiErrorHandler(error, callback);
  }
}

export default {
  createRecipient,
  updateRecipient,
  listRecipients,
  getRecipient,
  getAllLists
};
