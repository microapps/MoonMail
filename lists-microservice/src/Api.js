import Promise from 'bluebird';
import Events from './domain/Events';
import Recipients from './domain/Recipients';
import Lists from './domain/Lists';
import EventLog from './EventLog';
import RecipientModel from './domain/RecipientModel';
import RecipientESModel from './domain/RecipientESModel';
import MapCsvStringToRecipients from './recipients/MapCsvStringToRecipients';
import ListSegments from './domain/ListSegments';
import RecipientActivities from './domain/RecipientActivities';
import App from './App';

function publishRecipientImportedEvents(recipientsBatch, importId, batchFirstIndex, total) {
  const eventsBatch = recipientsBatch
    .map((recipient, index) => Events.buildRecipientImportedEvent({ recipient, importId, recipientIndex: batchFirstIndex + index, total }));

  const failed = eventsBatch.filter(validationResult => !!validationResult.error);
  if (failed.length > 0) return Promise.reject(new Error(`ValidationFailed: ${JSON.stringify(failed)}`));

  const batchToWrite = eventsBatch
    .filter(validationResult => !validationResult.error)
    .map(validationResult => validationResult.value);

  return EventLog.batchWrite({
    topic: Events.listRecipientImported,
    streamName: process.env.LIST_RECIPIENT_STREAM_NAME2,
    data: batchToWrite
  });
}

function publishRecipientCreatedEvent({ listId, userId, createRecipientPayload, subscriptionOrigin }) {
  return Events.buildRecipientCreatedEvent({ listId, userId, recipient: createRecipientPayload, subscriptionOrigin })
    .then(recipientCreatedEvent => EventLog.write({ topic: Events.listRecipientCreated, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientCreatedEvent }));
}

function publishRecipientUpdatedEvent({ listId, userId, recipientId, updateRecipientPayload }) {
  return Events.buildRecipientUpdatedEvent({ listId, userId, id: recipientId, data: updateRecipientPayload })
    .then(recipientUpdatedEvent => EventLog.write({ topic: Events.listRecipientUpdated, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientUpdatedEvent }));
}

function publishRecipientDeletedEvent({ listId, userId, recipientId }) {
  return Events.buildRecipientDeleteEvent({ listId, userId, id: recipientId })
    .then(recipientDeletedEvent => EventLog.write({ topic: Events.listRecipientDeleted, streamName: process.env.LIST_RECIPIENT_STREAM_NAME, payload: recipientDeletedEvent }));
}

function getRecipient({ listId, recipientId }) {
  return Recipients.find({ listId, recipientId });
}

function createRecipientsBatch(recipientCreatedEvents) {
  return Recipients.createBatchFromEvents(recipientCreatedEvents);
}

function updateRecipientsBatch(recipientUpdatedEvents) {
  return Recipients.updateBatchFromEvents(recipientUpdatedEvents);
}

function importRecipientsBatch(recipientImportedEvents, importStatusListner = null) {
  return Recipients.importFromEvents(recipientImportedEvents)
    .then(() => Lists.updateMetadataAttrsAndImportStatusFromEvents(recipientImportedEvents, importStatusListner));
}

function deleteRecipientEs(recipient) {
  const globalId = RecipientModel.buildGlobalId({ recipient });
  return RecipientESModel.remove(globalId);
}

function processCampaignActivity(events) {
  const eventTypeMapping = {
    [Events.emailDelivered]: 'received',
    [Events.emailClicked]: 'clicked',
    [Events.emailOpened]: 'opened'
  };
  const activities = events.map((event) => {
    const eventType = eventTypeMapping[event.type];
    return {
      activityType: 'campaignActivity',
      event: eventType,
      campaignId: event.payload.campaignId,
      timestamp: event.payload.timestamp,
      recipientId: event.payload.recipientId,
      listId: event.payload.listId
    };
  });

  return Promise.map(activities, activity => RecipientActivities.appendRecipientActivity(activity)
    .catch((error) => {
      App.logger().error('An error occurred while processing the activity, but it did not prevent to continue processing other events', JSON.stringify(activity));
      App.logger().error('Error details', error);
    }), { concurrency: 1 });
}

async function fetchUndeliverableRecipients({ listId }) {
  const batchSize = 250;
  let start = 0;
  let recipientsResult = {};
  let result = await RecipientESModel.undeliverableRecipients({ listId, from: 0, size: batchSize });
  if (!result.items) return { items: [], total: 0 };
  recipientsResult = result;
  while (result.total > start + batchSize) {
    start += start + batchSize;
    result = await RecipientESModel.undeliverableRecipients({ listId, from: start, size: batchSize });
    recipientsResult.items.push(result.items);
    recipientsResult.total = result.total;
  }
  return recipientsResult;
}

export default {
  publishRecipientCreatedEvent,
  publishRecipientUpdatedEvent,
  publishRecipientDeletedEvent,
  publishRecipientImportedEvents,
  mapCsvStringToRecipients: MapCsvStringToRecipients.execute,
  searchRecipients: Recipients.search,
  getRecipient,
  createRecipientsBatch,
  updateRecipientsBatch,
  importRecipientsBatch,
  getAllLists: Lists.all,
  createRecipientEs: Recipients.createEs,
  updateRecipientEs: Recipients.updateEs,
  deleteRecipientEs,
  fetchUndeliverableRecipients,
  createSegment: ListSegments.create,
  updateSegment: ListSegments.update,
  listSegments: ListSegments.list,
  deleteSegment: ListSegments.remove,
  getSegmentMembers: ListSegments.getMembers,
  getSegment: ListSegments.get,
  createActivity: RecipientActivities.create,
  processCampaignActivity
};
