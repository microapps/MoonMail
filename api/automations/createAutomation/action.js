import { Automation } from 'moonmail-models';
import cuid from 'cuid';
import omitEmpty from 'omit-empty';
import { logger } from '../../lib/index';
import decrypt from '../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';

export default function respond(event, cb) {
  logger().info('= createAutomation.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'automation']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => createAutomation(decoded.sub, event))
    .then(automation => cb(null, automation))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, [], cb);
    });
}

function createAutomation(userId, event) {
  const baseAutomation = { id: cuid(), userId, status: 'paused' };
  const automation = Object.assign({}, event.automation, baseAutomation);
  const checkParams = paramsChecker(['userId', 'listId', 'senderId', 'id']);
  return checkParams(automation)
    .then(validAutomation => Automation.save(validAutomation))
    .then(() => automation);
}
