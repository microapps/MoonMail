import * as Joi from 'joi';

function schema () {
  return Joi.object().keys({
    id: Joi.string().required(),
    userId: Joi.string().required(),
    senderId: Joi.string().required(),
    segmentId: Joi.string(),
    listId: Joi.string().required(),
    subject: Joi.string().required(),
    name: Joi.string().required(),
    status: Joi.string(),
    body: Joi.string().required(),
    template: Joi.string(),
    isUpToDate: Joi.boolean(),
    sentAt: Joi.number(),
    createdAt: Joi.number(),
    scheduleAt: Joi.number()
  });
}

function schemaCampaignToBeSent () {
  return Joi.alternatives().try(
    Joi.object({
      id: Joi.string().required(),
      userId: Joi.string().required(),
      senderId: Joi.string().allow(null),
      segmentId: Joi.string().allow(null),
      listId: Joi.string().required(),
      subject: Joi.string().required(),
      name: Joi.string().required(),
      status: Joi.string()
                 .regex(/^scheduled|draft$/)
                 .required(),
      body: Joi.string().required(),
      template: Joi.string(),
      isUpToDate: Joi.boolean(),
      sentAt: Joi.number(),
      createdAt: Joi.number(),
      scheduleAt: Joi.number(),
    }),
    Joi.object({
      id: Joi.string().required(),
      userId: Joi.string().required(),
      senderId: Joi.string().allow(null),
      segmentId: Joi.string().allow(null),
      listId: Joi.string().required(),
      subject: Joi.string().required(),
      name: Joi.string().required(),
      status: Joi.string()
                 .regex(/^scheduled|draft|PaymentGatewayError$/)
                 .required(),
      body: Joi.string().required(),
      template: Joi.string(),
      isUpToDate: Joi.boolean(),
      sentAt: Joi.number(),
      createdAt: Joi.number(),
      scheduleAt: Joi.number(),
    })
  );
}

export {
  schema,
  schemaCampaignToBeSent
}