import Joi from 'joi';
import moment from 'moment';
import isoCountryCodes from 'iso-3166-2';
import RecipientModel from './RecipientModel';

const listRecipientImported = 'lists.recipientImported';
const listRecipientCreated = 'lists.recipientCreated';
const listRecipientUpdated = 'lists.recipientUpdated';
const listRecipientDeleted = 'lists.recipientDeleted';

const emailDelivered = 'email.delivered';
const emailClicked = 'email.link.clicked';
const emailOpened = 'email.opened';

const alpha2CountryCodes = Object.values(isoCountryCodes.codes);

const eventSchemas = {
  [listRecipientImported]: {
    schema: Joi.object({
      type: listRecipientImported,
      payload: Joi.object({
        recipient: Joi.object({
          email: Joi.string().regex(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).required(),
          listId: Joi.string().required(),
          userId: Joi.string().required(),
          // TODO: Should we enforce string types on values here?
          metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.any()),
          systemMetadata: Joi.object({
            countryCode: Joi.string().valid(alpha2CountryCodes)
          })
        }).required(),
        totalRecipients: Joi.number().required(),
        recipientIndex: Joi.number().required(),
        importId: Joi.string().required()
      }).required()
    })
  },
  [listRecipientCreated]: {
    schema: Joi.object({
      type: listRecipientCreated,
      payload: Joi.object({
        recipient: {
          listId: Joi.string().required(),
          userId: Joi.string().required(),
          email: Joi.string().regex(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).required(),
          subscriptionOrigin: Joi.string().valid(Object.values(RecipientModel.subscriptionOrigins)),
          isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
          status: Joi.string().valid(RecipientModel.statuses.subscribed, RecipientModel.statuses.awaitingConfirmation).required(),
          metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required())
          // systemMetadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required()),
        }
      }).required()
    })
  },
  [listRecipientUpdated]: {
    schema: Joi.object({
      type: listRecipientUpdated,
      payload: Joi.object({
        listId: Joi.string().required(),
        userId: Joi.string().required(),
        id: Joi.string().required(),
        data: Joi.object({
          status: Joi.string().valid(Object.values(RecipientModel.statuses)),
          isConfirmed: Joi.boolean().when('status', { is: RecipientModel.statuses.awaitingConfirmation, then: Joi.only(false).default(false), otherwise: Joi.only(true).default(true) }),
          metadata: Joi.object().pattern(/^[A-Za-z_]+[A-Za-z0-9_]*$/, Joi.required())
        }).required()
      }).required()
    })
  },
  [listRecipientDeleted]: {
    schema: Joi.object({
      type: listRecipientDeleted,
      payload: Joi.object({
        listId: Joi.string().required(),
        userId: Joi.string().required(),
        id: Joi.string().required()
      })
    })
  },
  [emailDelivered]: {
    schema: Joi.object({
      type: emailDelivered,
      payload: Joi.object({
        userId: Joi.string(),
        listId: Joi.string(),
        recipientId: Joi.string(),
        campaignId: Joi.string(),
        segmentId: Joi.string(),
        timestamp: Joi.number()
      })
    })
  },
  [emailClicked]: {
    schema: Joi.object({
      type: emailClicked,
      payload: Joi.object({
        userId: Joi.string(),
        listId: Joi.string(),
        recipientId: Joi.string(),
        campaignId: Joi.string(),
        segmentId: Joi.string(),
        linkId: Joi.string(),
        metadata: Joi.object(),
        timestamp: Joi.number()
      })
    })
  },
  [emailOpened]: {
    schema: Joi.object({
      type: emailOpened,
      payload: Joi.object({
        userId: Joi.string(),
        listId: Joi.string(),
        recipientId: Joi.string(),
        campaignId: Joi.string(),
        segmentId: Joi.string(),
        metadata: Joi.object(),
        timestamp: Joi.number()
      })
    })
  }
};

const validate = event => Joi.validate(event, eventSchemas[event.type].schema);

const isValid = (event) => {
  try {
    const result = validate(event);
    return !result.error;
  } catch (err) {
    return false;
  }
};

function buildRecipientImportedEvent({ recipient, importId, recipientIndex, total }) {
  return validate({
    type: listRecipientImported,
    payload: {
      recipient,
      totalRecipients: total,
      recipientIndex,
      importId
    }
  });
}

function buildRecipientCreatedEvent({ listId, userId, recipient, subscriptionOrigin }) {
  return validate({
    type: listRecipientCreated,
    payload: { recipient: Object.assign({}, recipient, { listId, userId, subscriptionOrigin }) }
  });
}

function buildRecipientDeleteEvent({ listId, userId, id }) {
  return validate({
    type: listRecipientDeleted,
    payload: { listId, userId, id }
  });
}

function buildRecipientUpdatedEvent({ listId, userId, id, data }) {
  return validate({
    type: listRecipientUpdated,
    payload: { listId, userId, id, data }
  });
}

export default {
  listRecipientImported,
  listRecipientCreated,
  listRecipientUpdated,
  listRecipientDeleted,
  emailDelivered,
  emailClicked,
  emailOpened,
  isValid,
  validate,
  buildRecipientCreatedEvent,
  buildRecipientDeleteEvent,
  buildRecipientUpdatedEvent,
  buildRecipientImportedEvent
};
