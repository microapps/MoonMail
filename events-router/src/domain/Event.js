import R from 'ramda';
import Joi from 'joi';

const getKinesisPayload = R.path(['kinesis', 'data']);
const decodeBase64String = R.partialRight(Buffer.from, ['base64']);
const parseBase64Json = R.pipe(decodeBase64String, R.tryCatch(JSON.parse, R.always({})));
const deserializeKinesisEvent = R.pipe(getKinesisPayload, parseBase64Json);
const eventSchema = Joi.object({ type: Joi.string().required(), payload: Joi.object().required() });
const isValid = (event) => {
  try {
    const result = Joi.validate(event, eventSchema);
    return !result.error;
  } catch (err) {
    return false;
  }
};

export default {
  deserializeKinesisEvent,
  isValid
};
