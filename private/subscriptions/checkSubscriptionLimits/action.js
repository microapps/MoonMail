import { logger } from '../../lib/index';
import Subscriptions from '../../lib/subscriptions/index';
import { User } from '../../lib/models/user';

export default function respond(event, cb) {
  logger().info('= checkSubscriptionLimits.action', JSON.stringify(event));
  return User.get(event.userId)
    .then(user => Subscriptions.planRequirements.limitValidators[user.plan || 'free'])
    .then(limitValidator => limitValidator(event.currentState).perform())
    .then(result => cb(null, { quotaExceeded: false }))
    .catch((error) => {
      if (error.name === 'QuotaExceeded') return cb(null, { quotaExceeded: true });
      logger().error('= checkSubscriptionLimits.action', error);
      cb(error);
    });
}
