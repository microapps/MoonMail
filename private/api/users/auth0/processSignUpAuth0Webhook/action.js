import processSignUpAuth0WebHook from './processSignUpAuth0WebHook';
import { debug } from '../../../../lib/index';
import { ApiErrors } from '../../../../lib/errors';

export default function respond(event, cb) {
  debug('= processSignUpAuth0WebHook', JSON.stringify(event));
  processSignUpAuth0WebHook(event.data)
    .then(response => cb(null, response))
    .catch((error) => {
      debug('= processSignUpAuth0WebHook', error, error.stack);
      cb(ApiErrors.response(error));
    });
}
