import * as action from './action';
import { configureLogger } from '../../../../lib/index';

export default (event, context) => {
  configureLogger(event, context);
  action.respond(event, (error, response) => {
    return context.done(error, response);
  });
};
