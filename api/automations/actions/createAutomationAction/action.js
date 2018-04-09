import omitEmpty from 'omit-empty';
import CreateAutomationAction from '../lib/create_automation_action';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../../lib/api-utils';

export default function respond(event, cb) {
  logger().info('= createAutomationAction.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'automationId', 'automationAction']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => createAutomationAction(decoded.sub, event))
    .then(action => cb(null, action))
    .catch((err) => {
      logger().error(err);
      return errorHandler(err, ['InvalidAutomation'], cb);
    });
}

function createAutomationAction(userId, event) {
  const { automationAction, automationId } = event;
  return CreateAutomationAction.execute({ userId, automationAction, automationId });
}
