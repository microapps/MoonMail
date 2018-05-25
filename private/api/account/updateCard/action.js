import omitEmpty from 'omit-empty';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../../lib/api-utils';
import Subscriptions from '../../../lib/subscriptions/index';

export default function respond(event, cb) {
  logger().info('= updateCard.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'token']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => Subscriptions.attachUserCard(decoded.sub, event.token))
    .then(result => cb(null, result))
    .catch((error) => {
      logger().error('= handleSubscription.action', error, error.stack);
      return errorHandler(Subscriptions.handleStripeErrors(error), ['PaymentError'], cb);
    });
}

