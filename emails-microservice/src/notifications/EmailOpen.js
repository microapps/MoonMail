import Joi from 'joi';

const clickSchema = Joi.object({
  campaignId: Joi.string().required(),
  listId: Joi.string().required(),
  recipientId: Joi.string().required(),
  userId: Joi.string().required(),
  segmentId: Joi.string(),
  httpHeaders: Joi.object()
});

const isValid = (event) => {
  try {
    const result = Joi.validate(event, clickSchema, { allowUnknown: true });
    return !result.error;
  } catch (err) {
    return false;
  }
};

export default {
  isValid
};
