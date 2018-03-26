import Promise from 'bluebird';
import _ from 'lodash';
import RecipientModel from './RecipientModel';
import RecipientESModel from './RecipientESModel';

function importFromEvents(recipientImportedEvents) {
  const recipients = recipientImportedEvents
    .map(event => Object.assign({}, event.payload.recipient, { status: RecipientModel.statuses.subscribed, subscriptionOrigin: RecipientModel.subscriptionOrigins.listImport, isConfirmed: true }));

  // TODO: Move me to Recipients
  const recipientsToSave = deduplicateRecipientsByListId(recipients);
  return RecipientModel.batchCreate(recipientsToSave)
    .then((data) => {
      if (data.UnprocessedItems) {
        if (Object.keys(data.UnprocessedItems).length > 0) return Promise.reject(new Error('UnprocessedItems'));
      }
      return data;
    });
}

function createBatchFromEvents(recipientCreatedEvents) {
  const recipients = recipientCreatedEvents
    .map(event => event.payload.recipient);

  // TODO: Move me to Recipients
  const recipientsToSave = deduplicateRecipientsByListId(recipients);
  return RecipientModel.batchCreate(recipientsToSave)
    .then((data) => {
      if (data.UnprocessedItems) {
        if (Object.keys(data.UnprocessedItems).length > 0) return Promise.reject(new Error('UnprocessedItems'));
      }
      return data;
    });
}

function updateBatchFromEvents(recipientUpdatedEvents) {
  return Promise.map(recipientUpdatedEvents, recipientUpdatedEvent => RecipientModel.update(recipientUpdatedEvent.payload.data, recipientUpdatedEvent.payload.listId, recipientUpdatedEvent.payload.id), { concurrency: 2 });
}

function fixMetadataAttrs(m) {
  if (!m) return {};
  return Object.keys(m)
    .filter(r => r.match(/^[A-Za-z_]+[A-Za-z0-9_]*$/))
    .reduce((acum, key) => {
      acum[key.toString()] = m[key].toString();
      return acum;
    }, {});
}

function deduplicateRecipientsByListId(recipients) {
  const recipientsByListId = _.groupBy(recipients, 'listId');
  const uniqueRecipientsByListId = _.mapValues(recipientsByListId, rcpts => _.uniqBy(rcpts, 'email'));
  return _.flatten(Object.values(uniqueRecipientsByListId));
}

function cleanseRecipientAttributes(recipient) {
  const newRecipient = {
    listId: recipient.listId,
    userId: recipient.userId,
    id: (recipient.id || '').toString(),
    email: (recipient.email || '').trim(),
    subscriptionOrigin: recipient.subscriptionOrigin || 'listImport',
    isConfirmed: recipient.isConfirmed,
    status: recipient.status,
    riskScore: recipient.riskScore,
    metadata: fixMetadataAttrs(recipient.metadata),
    systemMetadata: recipient.systemMetadata,
    unsubscribedAt: recipient.unsubscribedAt,
    subscribedAt: recipient.subscribedAt,
    unsubscribedCampaignId: recipient.unsubscribedCampaignId,
    bouncedAt: recipient.bouncedAt,
    complainedAt: recipient.complainedAt,
    createdAt: recipient.createdAt,
    updatedAt: recipient.updatedAt
  };

  if (!newRecipient.email || !newRecipient.listId || !newRecipient.userId || !newRecipient.id) {
    return false;
  }
  return newRecipient;
}

export default {
  buildId: RecipientModel.buildId,
  create: RecipientModel.create,
  batchCreate: RecipientModel.batchCreate,
  update: RecipientModel.update,
  delete: RecipientModel.delete,
  find: RecipientESModel.find,
  createEs: RecipientESModel.create,
  updateEs: RecipientESModel.update,
  deleteEs: RecipientESModel.remove,
  searchByListAndConditions: RecipientESModel.searchByListAndConditions,
  searchSubscribedByListAndConditions: RecipientESModel.searchSubscribedByListAndConditions,
  search: RecipientESModel.search,
  createBatchFromEvents,
  importFromEvents,
  updateBatchFromEvents,
  cleanseRecipientAttributes
};
