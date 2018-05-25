import { logger } from '../../../../lib/index';
import decrypt from '../../../../lib/auth-token-decryptor';
import { errorHandler, newError } from '../../../../lib/api-utils';
import { User } from '../../../../lib/models/user';
import ApiKeys from '../../../../lib/api-keys';
import { GetUserAccountService } from '../lib/get_user_account_service';

const customErrors = {
  AlreadyEntitled: newError('AlreadyEntitled', 'This user has already an API key', 409)
};

export function respond(event, cb) {
  logger().info(JSON.stringify(event));
  return decrypt(event.authToken)
    .then(decoded => checkUserNotAlreadyEntitled(decoded.sub))
    .then(userId => generateApiKey(userId))
    .then(data => cb(null, { apiKey: data.apiKey }))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, { customErrors }, cb);
    });
}

function generateApiKey(userId) {
  return ApiKeys.create({ userId })
    .then(result => User.update({ apiKey: result.apiKey.value, apiKeyId: result.apiKey.id }, userId));
}

function checkUserNotAlreadyEntitled(userId) {
  return GetUserAccountService.getAccount(userId)
    .then(user => user.apiKey
      ? Promise.reject(customErrors.AlreadyEntitled) : userId);
}
