import AWS from 'aws-sdk';
import moment from 'moment';
import LambdaUtils from './lib/LambdaUtils';
import ImportRecipientsCsvRecursiveLambda from './ImportRecipientsCsvRecursiveLambda';
import App from './App';
import Api from './Api';
import Lists from './domain/Lists';
import UserNotifier from './lib/UserNotifier';
import Recipients from './domain/Recipients';
import RecipientModel from './domain/RecipientModel';

const lambdaClient = new AWS.Lambda();

function importRecipientsCsvFromS3(event, context, callback) {
  App.configureLogger(event, context);
  App.logger().info('importRecipientsCsvFromS3', JSON.stringify(event));
  let state = {};
  return LambdaUtils.parseS3Event(event)
    .then(s3Data => buildImportRecipientsParams(s3Data, event))
    .then((importRecipientsParams) => {
      state = importRecipientsParams;
      return importRecipientsCsvCommand(state, context);
    })
    .then(result => callback(null, { success: true }))
    .catch((err) => {
      App.logger().error(err);
      return handlerErrors(err, state, callback);
    });
}

function buildImportRecipientsParams(s3Data, event) {
  const fileKey = s3Data.key;
  const fileTokens = fileKey.split('.');
  return {
    userId: fileTokens[0],
    listId: fileTokens[1],
    fileName: fileKey,
    body: s3Data.body,
    headerMapping: JSON.parse(s3Data.metadata.headers),
    processingOffset: event.processingOffset || 0,
    // The event clone so to be used on recursive calls
    s3Event: event
  };
}

async function handlerErrors(error, importRecipientsParams, callback) {
  const errorMessage = error.message || error.errorMessage;
  if (!errorMessage.match(/ImportError/)) return callback(error);
  await Lists.updateImportStatus(importRecipientsParams.userId, importRecipientsParams.listId, importRecipientsParams.fileName, {
    status: 'failed',
    message: errorMessage,
    finishedAt: moment().unix()
  });
  await Lists.setAsProcessed(importRecipientsParams.userId, importRecipientsParams.listId);
  await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_UPDATED', data: { id: importRecipientsParams.listId, processed: true } });
  await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_IMPORT_FAILED', data: { listId: importRecipientsParams.listId } });
  callback(null, errorMessage);
}

// TODO: Refactor me!
async function importRecipientsCsvCommand(importRecipientsParams, context) {
  const blacklistedRecipients = await Api.fetchUndeliverableRecipients({ listId: importRecipientsParams.listId });
  await Lists.setImportingStarted(importRecipientsParams.userId, importRecipientsParams.listId, importRecipientsParams.fileName);
  await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_UPDATED', data: { id: importRecipientsParams.listId, processed: false } });
  await UserNotifier.notify(importRecipientsParams.userId, { type: 'LIST_IMPORT_PROCESSED', data: { listId: importRecipientsParams.listId } });
  return ImportRecipientsCsvRecursiveLambda.execute(Object.assign({}, { blacklistedRecipients: blacklistedRecipients.items.map(recipient => recipient.email) }, importRecipientsParams), lambdaClient, context);
}

export default {
  importRecipientsCsvFromS3
};
