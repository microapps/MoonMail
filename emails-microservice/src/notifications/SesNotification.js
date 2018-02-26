import Joi from 'joi';
import R from 'ramda';

const sesNotificationTypes = ['Delivery', 'Bounce', 'Complaint'];
const moonmailHeaders = ['X-Moonmail-User-ID', 'X-Moonmail-Campaign-ID', 'X-Moonmail-List-ID', 'X-Moonmail-Recipient-ID'];
const mmJoi = Joi.extend((joi) => ({
    base: joi.array(),
    name: 'array',
    language: { hasMoonMailHeaders: 'needs to contain MoonMail headers' },
    rules: [
      {
        name: 'hasMoonMailHeaders',
        validate(params, headersArray, state, options) {
          // const emailHeaders = R.pluck('name', headersArray);
          // const emailHeadersContains = R.partialRight(R.contains, [emailHeaders]);
          // console.log('******* Required', moonmailHeaders);
          // console.log('======= Actual', emailHeaders);
          // console.log('Valid:', R.all(emailHeadersContains)(moonmailHeaders));
          const getHeaderNamesFromSesHeaders = R.pluck('name');
          // const containsAllItmes = R.pipe(R.flip(R.contains), R.all);
          // R.pipe(getHeaderNamesFromSesHeaders, containsAllItmes)
          const emailHeadersContainAll = R.pipe(
            R.pluck('name'),
            R.flip(R.contains),
            R.all
          )(headersArray);
          console.log('Valid2:', emailHeadersContainAll(moonmailHeaders));
          // R.all(headersContains(value))(moonmailHeaders)
          // if (value % 1 !== 0) {
          //     // Generate an error, state and options need to be passed
          //     return this.createError('number.round', { v: value }, state, options);
          // }
          // const
          return value;
        }
      }
    ]
}));
const notificationSchema = mmJoi.object({
  notificationType: mmJoi.string().valid(sesNotificationTypes),
  mail: mmJoi.object({
    headers: mmJoi.array().items(mmJoi.object()).hasMoonMailHeaders().required()
  }).required()
})

// {
//   [listRecipientImported]: {
//     schema: Joi.object({
//       type: listRecipientImported,
//       payload: Joi.object({
//         recipient: Joi.object({
//           email: Joi.string().required().email(),
//           listId: Joi.string().required(),
//           userId: Joi.string().required(),
//           // TODO: Should we enforce string types on values here?
//           metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.any()),
//           systemMetadata: Joi.object({
//             countryCode: Joi.string().valid(alpha2CountryCodes)
//           })
//         }).required(),
//         totalRecipients: Joi.number().required(),
//         recipientIndex: Joi.number().required(),
//         importId: Joi.string().required()
//       }).required()
//     })
//   },
//   [listRecipientCreated]: {
//     schema: Joi.object({
//       type: listRecipientCreated,
//       payload: Joi.object({
//         recipient: {
//           listId: Joi.string().required(),
//           userId: Joi.string().required(),
//           email: Joi.string().required().email(),
//           subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)),
//           isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
//           status: Joi.string().valid(RecipientModel.statuses.subscribed, RecipientModel.statuses.awaitingConfirmation).required(),
//           metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required())
//           // systemMetadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
//         }
//       }).required()
//     })
//   },
//   [listRecipientUpdated]: {
//     schema: Joi.object({
//       type: listRecipientUpdated,
//       payload: Joi.object({
//         listId: Joi.string().required(),
//         userId: Joi.string().required(),
//         id: Joi.string().required(),
//         data: Joi.object({
//           status: Joi.string().valid(Object.values(RecipientModel.statuses)),
//           isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
//           metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required())
//         }).required()
//       }).required()
//     })
//   },
//   [listRecipientDeleted]: {
//     schema: Joi.object({
//       type: listRecipientDeleted,
//       payload: Joi.object({
//         listId: Joi.string().required(),
//         userId: Joi.string().required(),
//         id: Joi.string().required()
//       })
//     })
//   }
// };

const isValid = (event) => {
  try {
    const result = Joi.validate(event, notificationSchema, { allowUnknown: true });
    // console.log(event, result)
    return !result.error;
  } catch (err) {
    // console.log(event, err)
    return false;
  }
};

export default {
  isValid
};
