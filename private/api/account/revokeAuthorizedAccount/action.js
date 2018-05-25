import omitEmpty from 'omit-empty';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';
import { User } from '../../../lib/models/user';

export async function respond(event, cb) {
  logger().info('= revokeAuthorizedAccount.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'userId']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => getUsersDetails({mainUserId: decoded.sub,
      invitedUserId: decodeURIComponent(event.userId)}))
    .then(usersDetails => revokeAccess(usersDetails))
    .then(result => cb(null, result))
    .catch(err => {
      logger().error(err);
      return errorHandler(err, [], cb)
    });
}

async function revokeAccess({mainUser, invitedUser}) {
  logger().debug('= revokeAccess', JSON.stringify({mainUser, invitedUser}));
  const authorizations = (mainUser.authorizations || []).filter(user => user.userId !== invitedUser.id);
  const impersonations = (invitedUser.impersonations || []).filter(user => user.userId !== mainUser.id);
  const updatedMain = await User.update({authorizations}, mainUser.id);
  const updatedInvited = await User.update({impersonations}, invitedUser.id);
  return {authorizations};
}

async function getUsersDetails({mainUserId, invitedUserId}) {
  logger().debug('= getUsersDetails', mainUserId, invitedUserId);
  const mainUser = await User.get(mainUserId);
  const invitedUser = await User.get(invitedUserId);
  return {mainUser, invitedUser};
}

