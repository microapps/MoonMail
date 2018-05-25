import omitEmpty from 'omit-empty';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler, newError } from '../../../lib/api-utils';
import Subscriptions from '../../../lib/subscriptions/index';

export default function respond(event, cb) {
  logger().info('= handleSubscription.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'billingPlan']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => Subscriptions.updateUserSubscription(decoded.sub, event.billingPlan, event.subscriptionType || 'monthly', event.token, event.clickId))
    .then(result => cb(null, result))
    .catch((error) => {
      logger().error('= handleSubscription.action', error);
      if (error.name === 'PaymentGatewayError') {
        return errorHandler(newError(error.name, error.message, 401), ['PaymentGatewayError'], cb);
      }
      return errorHandler(error, [], cb);
    });
}
