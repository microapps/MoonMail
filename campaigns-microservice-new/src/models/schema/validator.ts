import * as Joi from 'joi';

export default function validate(object: object, schema: any) {
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