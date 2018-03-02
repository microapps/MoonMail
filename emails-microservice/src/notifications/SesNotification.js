import Joi from 'joi';
import R from 'ramda';

const sesNotificationTypes = ['Delivery', 'Bounce', 'Complaint'];
const moonmailHeaders = ['X-Moonmail-User-ID', 'X-Moonmail-Campaign-ID', 'X-Moonmail-List-ID', 'X-Moonmail-Recipient-ID'];
const mmJoi = Joi.extend(joi => ({
  base: joi.array(),
  name: 'array',
  language: { hasMoonMailHeaders: 'needs to contain MoonMail headers' },
  rules: [
    {
      name: 'hasMoonMailHeaders',
      validate(params, headersArray, state, options) {
        const emailHeadersContainAll = R.pipe(
          R.pluck('name'),
          R.flip(R.contains),
          R.all
        )(headersArray);
        return emailHeadersContainAll(moonmailHeaders)
          ? headersArray
          : this.createError('array.hasMoonMailHeaders', { v: headersArray }, state, options);
      }
    }
  ]
}));
const notificationSchema = mmJoi.object({
  notificationType: mmJoi.string().valid(sesNotificationTypes),
  mail: mmJoi.object({
    headers: mmJoi.array().items(mmJoi.object()).hasMoonMailHeaders().required()
  }).required()
});

const isValid = (event) => {
  try {
    const result = mmJoi.validate(event, notificationSchema, { allowUnknown: true });
    return !result.error;
  } catch (err) {
    return false;
  }
};

export default {
  isValid
};
