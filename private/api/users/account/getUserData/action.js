import { debug } from '../../../../lib/index';
import { User } from '../../../../lib/models/user';
import { ApiErrors } from '../../../../lib/errors';
import ReputationControls from '../../../../lib/reputation/index';

export function respond(event, cb) {
  debug('= getUserData.action', JSON.stringify(event));
  const userId = event.userId;

  // Build reputation before returning user data since currently
  // there is no way where to trigger the user reputation recalculation
  ReputationControls.performAndUpdate(userId)
    .then(reputationData => User.get(userId))
    .then(userData => cb(null, userData))
    .catch(err => cb(ApiErrors.response(err)));
}
