import Promise from 'bluebird';
import UserNotifier from './lib/UserNotifier';
import LambdaUtils from './lib/LambdaUtils';
import Events from './domain/Events';
import App from './App';
import Api from './Api';
import wait from './lib/utils/wait';
import Recipients from './domain/Recipients';


async function broadcastImportStatus({ listId, userId, importStatus }) {
  const imported = importStatus.status === 'success';
  if (imported) {
    // If imported then wait a bit to give time recipientsCounter to finish
    // FIXME: Remove recipientCounter service and make the calculations here instead
    await wait(200);
    await UserNotifier.notify(userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId } });
    return UserNotifier.notify(userId, { type: 'LIST_IMPORT_SUCCEDED', data: { listId } });

    // // Inmediatelly unlock lists with more than 10000 recipients, poeplo uploading
    // // big lists wont expects results anytime soon.
    // if (total < 10000) return Promise.resolve();
    // await setProcessing(userId, listId, false);
    // return UserNotifier.notify(userId, { type: 'LIST_UPDATED', data: { id: listId, processed: true } });
  }
  return UserNotifier.notify(userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId } });
}

function eventStreamProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('eventStreamProcessor', JSON.stringify(event));
  try {
    const validateEvent = (event) => {
      const { value, error } = Events.validate(event);
      if (error) {
        const errorMessage = `[ERROR], Invalid events detected in the stream. Event:${event}. ${error}`;
        App.logger().error(errorMessage);
        throw new Error(errorMessage);
      }
      return value;
    };

    const fetchEvents = (eventStream, eventType) => LambdaUtils
      .parseKinesisStreamTopicEvents(eventStream, eventType)
      .map(validateEvent);

    const recipientImportedEvents = fetchEvents(event, Events.listRecipientImported);
    const recipientCreatedEvents = fetchEvents(event, Events.listRecipientCreated);
    const recipientUpdatedEvents = fetchEvents(event, Events.listRecipientUpdated);
    return Api.importRecipientsBatch(recipientImportedEvents, broadcastImportStatus)
      .then(() => Api.createRecipientsBatch(recipientCreatedEvents))
      .then(() => Api.updateRecipientsBatch(recipientUpdatedEvents))
      .then(() => callback(null, { success: true }))
      .catch((err) => {
        App.logger().error(err);
        callback(err);
      });
  } catch (err) {
    App.logger().error(err);
    callback(err);
  }
}


function recipientImportedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('recipientImportedHandler', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientImported);

  // TODO: Evaluate if it's better to use validate instead of isValid
  if (recipients.some(e => !Events.isValid(e))) {
    const error = '[ERROR], Invalid events detected in the stream';
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }
  const validRecipients = recipients.filter(Events.isValid);
  return Api.importRecipientsBatch(validRecipients, broadcastImportStatus)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function recipientCreatedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('recipientCreatedProcessor', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientCreated);

  const invalidEvents = recipients.filter(e => !Events.isValid(e));
  if (invalidEvents.length > 0) {
    const { error } = Events.validate(invalidEvents.shift());
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }

  const validEvents = recipients.filter(Events.isValid);
  return Api.createRecipientsBatch(validEvents)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

function recipientUpdatedProcessor(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('recipientCreatedProcessor', JSON.stringify(event));

  const recipients = LambdaUtils
    .parseKinesisStreamTopicEvents(event, Events.listRecipientUpdated);
  App.logger().debug('recipients', JSON.stringify(recipients));

  const invalidEvents = recipients.filter(e => !Events.isValid(e));
  if (invalidEvents.length > 0) {
    const { error } = Events.validate(invalidEvents.shift());
    App.logger().error(error);
    callback(new Error(JSON.stringify(error)));
  }
  const validEvents = recipients.filter(Events.isValid);
  return Api.updateRecipientsBatch(validEvents)
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}


function syncRecipientRecordWithES(record) {
  if (record.eventName === 'INSERT') {
    const item = Recipients.cleanseRecipientAttributes(record.newImage);
    if (!item.id) {
      App.logger().debug('Recipient skipped from the ES syncrhonization due to validation issues', JSON.stringify(record.newImage));
      return Promise.resolve({});
    }
    return Api.createRecipientEs(item);
  }
  if (record.eventName === 'MODIFY') {
    const item = Recipients.cleanseRecipientAttributes(record.newImage);
    if (!item.id) {
      App.logger().debug('Recipient skipped from the ES syncrhonization due to validation issues', JSON.stringify(record.newImage));
      return Promise.resolve({});
    }
    return Api.updateRecipientEs(item);
  }

  const item = Recipients.cleanseRecipientAttributes(record.oldImage);
  if (!item.id) {
    App.logger().debug('Recipient skipped from the ES syncrhonization due to validation issues', JSON.stringify(record.newImage));
    return Promise.resolve({});
  }
  return Api.deleteRecipientEs(item);
}


function syncRecipientStreamWithES(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('syncRecipientStreamWithES', JSON.stringify(event));

  const events = LambdaUtils
    .parseDynamoDBStreamEvent(event);

  return Promise.map(events, evt => syncRecipientRecordWithES(evt)
    .catch((err) => {
      App.logger().error(err);
      if ((err.name || '').match(/ValidationError/)) return Promise.resolve(err);
      // During migration we don't want to explode if we can't remove the recipient from ES
      if ((err.displayName || '').match(/NotFound/)) return Promise.resolve(err);
      return Promise.reject(err);
    }), { concurrency: 10 })
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

export default {
  recipientImportedProcessor,
  recipientCreatedProcessor,
  recipientUpdatedProcessor,
  eventStreamProcessor,
  syncRecipientStreamWithES
};
