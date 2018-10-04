import * as Joi from 'joi';

export function validate(object, schema) {
  const {error, value} = Joi.validate(object, schema);
  let friendlyError = null;
  if (error) {
    friendlyError = error.details;
  }
  return {
    error: friendlyError,
    value
  };
}