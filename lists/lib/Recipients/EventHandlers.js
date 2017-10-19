import omitEmpty from 'omit-empty';
import Promise from 'bluebird';
import { strip } from 'eskimo-stripper';
import Recipients from './Recipients';
import StreamUtils from '../StreamUtils';
import updateSystemMetadataFromCFHeaders from './services/updateSystemMetadataFromCFHeaders';

function processOpenClickEventsStream(records) { // out
  return Promise.map(records, record => this.processOpenClickEvent(record), { concurrency: 2 });
}

function processOpenClickEvent(record) {
  if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
    const item = strip(record.dynamodb.NewImage);
    if (!item.metadata || !item.listId || !item.recipientId) return Promise.resolve();
    const { listId, recipientId, metadata } = item;
    return Commands.updateSystemMetadataFromCFHeaders(listId, recipientId, metadata);
  }
  return Promise.resolve();
}

function syncRecipientStreamWithES(records) {
  return Promise.map(records, record => this.syncRecipientRecordWithES(record), { concurrency: 10 });
}

function syncRecipientRecordWithES(record) {
  if (record.eventName === 'INSERT') {
    const item = strip(record.dynamodb.NewImage);
    return Recipients.createESRecipient(Recipients.buildESId(item), item);
  }
  if (record.eventName === 'MODIFY') {
    const item = strip(record.dynamodb.NewImage);
    return Recipients.updateESRecipient(Recipients.buildESId(item), item);
  }
  if (record.eventName === 'REMOVE') return Recipients.deleteESRecipient(Recipients.buildESId(strip(record.dynamodb.OldImage)));
}

function processRecipientUpdateEvent(event) {
  const kinesisRouter = StreamUtils.createKinesisStreamRouter((record) => {

  });
  const records = StreamUtils.parseKinesisStreamEvents(event);
  return kinesisRouter(records);
}

export default {

};
