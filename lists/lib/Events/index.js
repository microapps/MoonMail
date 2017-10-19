import Joi from 'joi';
import { Recipient } from 'moonmail-models';

const eventSchemas = {
  'openclick.recipient.import': {
    schema: Joi.object({
      type: 'list.recipient.import',
      payload: Joi.object({
        recipient: Joi.object({
          id: Joi.string().required(),
          email: Joi.string().required(),
          listId: Joi.string().required(),
          userId: Joi.string().required(),
          status: Joi.string().valid(Recipient.statuses.subscribed).required(),
          isConfirmed: Joi.boolean().required(),
          metadata: Joi.object().unknown(true)
        }).required()
      }).required()
    })
  }
};

const isValid = (event) => {
  try {
    const result = eventSchemas[event.type].schema.validate(event);
    return !result.error;
  } catch (err) {
    return false;
  }
};

export default {
  isValid
};