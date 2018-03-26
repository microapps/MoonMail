import Promise from 'bluebird';
import UserNotifier from './lib/UserNotifier';
import LambdaUtils from './lib/LambdaUtils';
import Events from './domain/Events';
import App from './App';
import Api from './Api';
import wait from './lib/utils/wait';
import Recipients from './domain/Recipients';
import DeadLetterQueue from './lib/DeadLetterQueue';


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

const processNonRetriableError = function processNonRetriableError(event, error) {
  const message = { event, error: error.message };
  return DeadLetterQueue.put(message);
};

const buildEventStreamBatchProcessor = function buildEventStreamBatchProcessor(kinesisEvents) {
  return (eventType, processBatchApiFn) => {
    const validatedEvts = kinesisEvents
      .filter(e => e.partitionKey === eventType)
      .map(e => e.data)
      .map(Events.validate);

    const processBatch = (validatedEvents) => {
      const validEvents = validatedEvents
        .filter(e => !e.error)
        .map(e => e.value);

      const validationErrors = validatedEvents
        .filter(e => !!e.error)
        .map(e => e.error);

      // importRecipientsBatch requires broadcastImportStatus
      // TODO: improve the API so this dont seem out of its place.
      return processBatchApiFn(validEvents, broadcastImportStatus)
        .then(() => Promise.map(validationErrors, validationError => processNonRetriableError(validationError._object, validationError)));
    };

    return Promise.resolve(validatedEvts)
      .then(processBatch)
      .catch((err) => {
        App.logger().error(err);
        if (err.message.match(/UnprocessedItems/) || (err.code || '').match('ProvisionedThroughputExceededException')) {
          return Promise.reject(new Error('RetriableError'));
        }
        // Send unkonwn errors to the DLQ
        return Promise.map(kinesisEvents.map(e => e.data), evt => processNonRetriableError(evt, err));
      });
  };
};

function eventStreamProcessor(eventStream, context, callback) {
  App.configureLogger(eventStream, context);
  App.logger().debug('eventStreamProcessor', JSON.stringify(eventStream));

  const kinesisEvents = LambdaUtils.parseKinesisStreamEvent(eventStream);
  const eventStreamBatchProcessor = buildEventStreamBatchProcessor(kinesisEvents);

  return Promise.each([
    [Events.listRecipientImported, Api.importRecipientsBatch],
    [Events.listRecipientCreated, Api.createRecipientsBatch],
    [Events.listRecipientUpdated, Api.updateRecipientsBatch],
    [Events.emailDelivered, Api.processCampaignActivity],
    [Events.emailOpened, Api.processCampaignActivity],
    [Events.emailClicked, Api.processCampaignActivity]
  ], ([eventType, batchProcessor]) => eventStreamBatchProcessor(eventType, batchProcessor))
    .then(() => callback(null, { success: true }))
    .catch((err) => {
      App.logger().error(err);
      if (err.message.match(/RetriableError/)) {
        return callback(err);
      }
      // Send unkonwn errors to the DLQ
      return Promise.map(kinesisEvents.map(e => e.data), evt => processNonRetriableError(evt, err))
        .then(() => callback(null, { success: true }));
    });
}

function syncRecipientRecordWithES(record) {
  const eventTypeOperationsMapping = {
    INSERT: ['newImage', Api.createRecipientEs],
    MODIFY: ['newImage', Api.updateRecipientEs],
    REMOVE: ['oldImage', Api.deleteRecipientEs]
  };

  const [image, elasticSearchProcessor] = eventTypeOperationsMapping[record.eventName];
  // TODO: Move me inside the API
  const item = Recipients.cleanseRecipientAttributes(record[image]);
  if (!item) return Promise.resolve();
  return elasticSearchProcessor(item)
    .catch(error => processNonRetriableError({ type: 'listRecipientChangedDDB', payload: item }, error));
}


function syncRecipientStreamWithES(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().debug('syncRecipientStreamWithES', JSON.stringify(event));

  const events = LambdaUtils
    .parseDynamoDBStreamEvent(event);

  return Promise.map(events, evt => syncRecipientRecordWithES(evt))
    .then(result => callback(null, result))
    .catch((err) => {
      App.logger().error(err);
      callback(err);
    });
}

export default {
  eventStreamProcessor,
  syncRecipientStreamWithES
};
