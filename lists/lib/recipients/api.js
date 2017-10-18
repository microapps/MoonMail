import Promise from 'bluebird';
import { strip } from 'eskimo-stripper';
import parseRequestMetadata from '../services/parseRequestMetadata';
import Recipients from './Recipients';
import StreamUtils from '../StreamUtils';

const Api = {
  processOpenClickEventsStream(records) {
    return Promise.map(records, record => this.processOpenClickEvent(record), { concurrency: 2 });
  },

  processOpenClickEvent(record) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const item = strip(record.dynamodb.NewImage);
      if (!item.metadata || !item.listId || !item.recipientId) return Promise.resolve();
      const recipientId = item.recipientId;
      const listId = item.listId;
      // We are performing a get before the update before
      // somehow listId and recipientId sometimes point to non-existing recipients
      // on this way we can avoid errors instead of recovering from them on the update.
      return Recipients.getRecipient(listId, recipientId)
        .then((recipient) => {
          if (!recipient.id) return Promise.resolve();
          return parseRequestMetadata(item.metadata)
            .then(newMetadata => this.storeRecipientSystemMetadata(recipient, newMetadata));
        });
    }
    return Promise.resolve();
  },

  syncRecipientStreamWithES(records) {
    return Promise.map(records, record => this.syncRecipientRecordWithES(record), { concurrency: 10 });
  },

  syncRecipientRecordWithES(record) {
    if (record.eventName === 'INSERT') {
      const item = strip(record.dynamodb.NewImage);
      return Recipients.createESRecipient(Recipients.buildESId(item), item);
    }
    if (record.eventName === 'MODIFY') {
      const item = strip(record.dynamodb.NewImage);
      return Recipients.updateESRecipient(Recipients.buildESId(item), item);
    }
    if (record.eventName === 'REMOVE') return Recipients.deleteESRecipient(Recipients.buildESId(strip(record.dynamodb.OldImage)));
  },

  storeRecipientSystemMetadata(recipient, systemMetadata) {
    if (systemMetadata.userAgent.match(/GoogleImageProxy/)) return Promise.resolve();
    return Recipients.updateRecipient({ systemMetadata, listId: recipient.listId, recipientId: recipient.id });
  },

  processRecipientUpdateEvent(event) {
    const kinesisRouter = StreamUtils.createKinesisStreamRouter((record) => {

    });
    const records = StreamUtils.parseKinesisStreamEvents(event);
    return kinesisRouter(records);
  }
};

export default Api;
