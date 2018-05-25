import { configureLogger } from '../../../lib/index';
import * as action from './action';

export default (event, context) => {
  configureLogger(event, context);
  action.respond(event, (error, response) => {
    return context.done(error, response);
  });
};
