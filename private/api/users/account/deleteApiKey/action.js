import { logger } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { errorHandler, newError } from '../../../../lib/api-utils';
import { User } from '../../../../lib/models/user';
import ApiKeys from '../../../../lib/api-keys';

const customErrors = {
  NonExistingKey: newError('NonExistingKey', 'This user does not have an API key', 409)
};

export function respond(event, cb) {
  logger().info(JSON.stringify(event));
  return decrypt(event.authToken)
    .then(decoded => checkUserHasKey(decoded.sub))
    .then(user => deleteApiKey(user))
    .then(data => cb(null, true))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, { customErrors }, cb);
    });
}

function deleteApiKey(user) {
  return ApiKeys.delete({ apiKeyId: user.apiKeyId })
    .then(result => User.update({ apiKey: null, apiKeyId: null }, user.id));
}

function checkUserHasKey(userId) {
  return User.get(userId)
    .then(user => !user.apiKey
      ? Promise.reject(customErrors.NonExistingKey) : user);
}
