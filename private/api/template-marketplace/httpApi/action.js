import omitEmpty from 'omit-empty';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';
import { newError } from '../../lib/errors';
import FunctionsClient from '../../../lib/functions_client';
import { User } from '../../../lib/models/user';

const actionsMapping = {
  create: createTemplateHttp,
  list: listTemplatesHttp,
  update: updateTemplateHttp,
  show: getTemplateHttp,
  listTags: listTagsHttp,
  buy: buyTemplateHttp
};

export default function respond(event, cb) {
  actionsMapping[event.action](event, cb);
}

function createTemplate(userId, event) {
  const template = Object.assign({}, event.template, { userId });
  return FunctionsClient.execute(process.env.CREATE_TEMPLATE_FUNCTION, { template });
}

function createTemplateHttp(event, cb) {
  logger().info('= createTemplateHttp.action', JSON.stringify(event));
  const customErrors = [
    ['TemplateValidationError', 'Unprocessable entity', 422]
  ];
  const checkParams = paramsChecker(['authToken', 'template']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => createTemplate(decoded.sub, event))
    .then(template => cb(null, template))
    .catch((err) => {
      logger().error(err);
      const customError = customErrors.find(e => e[0] === err.message);
      const error = customError ? newError(...customError) : err;
      const customErrorNames = customErrors.map(e => e[0]);
      return errorHandler(error, customErrorNames, cb);
    });
}

async function getTemplate(userId, event) {
  const user = await User.get(userId);
  const template = await FunctionsClient.execute(process.env.GET_TEMPLATE_FUNCTION, event);
  if (template.price > 0 && !(user.installedTemplates || []).some(t => t === template.id)) {
    delete template.body;
  }
  return template;
}

function getTemplateHttp(event, cb) {
  logger().info('= getTemplateHttp.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'templateId']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => getTemplate(decoded.sub, event))
    .then(template => cb(null, template))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}

function listTemplates(event) {
  return FunctionsClient.execute(process.env.LIST_TEMPLATES_FUNCTION, event);
}

function listTemplatesHttp(event, cb) {
  logger().info('= listTemplatesHttp.action', JSON.stringify(event));
  return listTemplates(omitEmpty(event))
    .then(templates => cb(null, templates))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}

function updateTemplate(event) {
  return FunctionsClient.execute(process.env.UPDATE_TEMPLATE_FUNCTION, event);
}

function updateTemplateHttp(event, cb) {
  logger().info('= updateTemplateHttp.action', JSON.stringify(event));
  const customErrors = [
    ['TemplateValidationError', 'Unprocessable entity', 422]
  ];
  const checkParams = paramsChecker(['authToken', 'templateId', 'template']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => updateTemplate(event))
    .then(segment => cb(null, segment))
    .catch((err) => {
      logger().error(err);
      const customError = customErrors.find(e => e[0] === err.message);
      const error = customError ? newError(...customError) : err;
      const customErrorNames = customErrors.map(e => e[0]);
      return errorHandler(error, customErrorNames, cb);
    });
}

function listTags(event) {
  return FunctionsClient.execute(process.env.LIST_TAGS_FUNCTION);
}

function listTagsHttp(event, cb) {
  logger().info('= listTagsHttp.action', JSON.stringify(event));
  return listTags(event)
    .then(tags => cb(null, tags))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}

async function buyTemplate(userId, event) {
  const template = await getTemplate(userId, event);
  if (template.price === 0) return Promise.resolve(template);
  const user = await User.get(userId);
  const stripe = require('stripe')(process.env.STRIPE_API_KEY);
  await stripe.charges.create({
    amount: template.price, // amount in cents
    currency: 'usd',
    customer: user.stripeAccount.customerId,
    description: `Purchase of ${template.name}`
  });
  const installedTemplates = user.installedTemplates || [];
  installedTemplates.push(event.templateId);
  await User.update({ installedTemplates }, userId);
  return getTemplate(userId, event);
}

function buyTemplateHttp(event, cb) {
  logger().info('= buyTemplateHttp.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => buyTemplate(decoded.sub, event))
    .then(template => cb(null, { template }))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}
