import * as action from './action';

export default (event, context) => {
  action.respond(event, (error, response) => {
    return context.done(error, response);
  });
};
