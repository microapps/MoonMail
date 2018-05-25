import omitEmpty from 'omit-empty';
import { logger } from '../../lib/index';
import Subscriptions from '../../lib/subscriptions/index';

export default function respond(event, cb) {
  logger().info('= getSubscriptionDetails.action', JSON.stringify(event));
  return Promise.resolve(omitEmpty(event))
    .then(params => Subscriptions.billingPlans.getPlan(params.plan))
    .then(result => cb(null, result))
    .catch((error) => {
      logger().error('= getSubscriptionDetails.action', error);
      cb(error);
    });
}
