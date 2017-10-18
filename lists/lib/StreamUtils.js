import Promise from 'bluebird';
import { parse } from 'aws-event-parser';
import { strip } from 'eskimo-stripper';

const StreamUtils = {
  createDynamoDBStreamRouter(routerFn, concurrency) {
    return records => Promise.map(records, (record) => {
      const oldImage = record.dynamodb.OldImage ? strip(record.dynamodb.OldImage) : {};
      const newImage = record.dynamodb.NewImage ? strip(record.dynamodb.NewImage) : {};
      return routerFn(record.eventName, { oldImage, newImage });
    }, concurrency);
  },

  createDynamoDBStreamProcessor(eventTypeProcessorMapping, concurrency) {
    return records => Promise.map(records, (record) => {
      const eventType = record.eventName;
      const processorFn = eventTypeProcessorMapping[eventType];
      if (!processorFn) return Promise.resolve();
      const oldImage = record.dynamodb.OldImage ? strip(record.dynamodb.OldImage) : {};
      const newImage = record.dynamodb.NewImage ? strip(record.dynamodb.NewImage) : {};
      return processorFn({ oldImage, newImage });
    }, concurrency);
  },

  parseDynamoDBStreamEventGroups(records) {
    const events = this.parseDynamoDBStreamEvents(records);
    const deletes = events.filter(event => event.eventName === 'REMOVE');
    const inserts = events.filter(event => event.eventName === 'INSERT');
    const updates = events.filter(event => event.eventName === 'MODIFY');
    return { deletes, inserts, updates };
  },

  parseDynamoDBStreamEvents(records) {
    return records.map((record) => {
      const oldImage = record.dynamodb.OldImage ? strip(record.dynamodb.OldImage) : {};
      const newImage = record.dynamodb.NewImage ? strip(record.dynamodb.NewImage) : {};
      return { eventName: record.eventName, oldImage, newImage };
    });
  },

  parseKinesisStreamEvents(event) {
    return parse(event);
  },

  createKinesisStreamRouter(routerFn, concurrency) {
    return records => Promise.map(records, record => routerFn(record), concurrency);
  }

};

export default StreamUtils;
