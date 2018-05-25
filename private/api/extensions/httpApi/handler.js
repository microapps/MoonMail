import omitEmpty from 'omit-empty';
import { configureLogger, logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';
import { newError } from '../../lib/errors';
import FunctionsClient from '../../../lib/functions_client';

const actionsMapping = {
  install: {
    function: process.env.INSTALL_EXTENSION_FN,
    requiredParams: ['extensionId', 'authToken'],
    errors: [
      ['ExtensionAlreadyInstalled', 'This extension is already installed', 409],
      ['ExtensionDoesNotExist', 'The extension does not exist', 400],
      // TODO: We might need to catch other payment errors as well.
      ['Your card was declined.', 'Your card was declined.', 403]
    ]
  },
  uninstall: {
    function: process.env.UNINSTALL_EXTENSION_FN,
    requiredParams: ['extensionId', 'authToken'],
    errors: [
      ['ExtensionNotInstalled', 'This extension is not installed', 409],
      ['SubscriptionNotFound', 'The subscription to this extension does not exist', 400]
    ]
  }
};

export default (event, context) => {
  configureLogger(event, context);
  const action = actionsMapping[event.action];
  const checkParams = paramsChecker(action.requiredParams);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => FunctionsClient.execute(
      action.function,
      {userId: decoded.sub, extensionId: event.extensionId}
    ))
    .then(result => context.done(null, result))
    .catch(err => {
      logger().error(err);
      const customError = action.errors.find(e => e[0] === err.message);
      const error = customError ? newError(...customError) : err;
      const customErrorNames = action.errors.map(e => e[0]);
      return errorHandler(error, customErrorNames, context.done);
    });
};
