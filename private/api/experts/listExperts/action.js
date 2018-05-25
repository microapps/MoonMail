import omitEmpty from 'omit-empty';
import { debug } from '../../../lib/index';
import { ApiErrors } from '../../../lib/errors';
import { User } from '../../../lib/models/user';
import { Expert } from '../../../lib/models/expert';


export function respond(event, cb) {
  debug('= listExperts.action', JSON.stringify(event));
  const defaultOptions = {
    limit: 10
  };
  Expert.allByTypeAndCountry(event.options.type,
    omitEmpty(Object.assign({}, defaultOptions, event.options)))
    .then((experts) => {
      debug('= listExperts.action', 'Success');
      return cb(null, experts);
    }).catch((e) => {
      debug('= listExperts.action', e);
      return cb(ApiErrors.response(e));
    });
}
