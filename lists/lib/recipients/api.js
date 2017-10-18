import Promise from 'bluebird';
import { strip } from 'eskimo-stripper';
import parseRequestMetadata from '../services/parseRequestMetadata';
import Recipients from './Recipients';
import StreamUtils from '../StreamUtils';
import getGeoInformationFromIp from '../services/getGeoInformationFromIp';
import parseCFRequestHeaders from '../services/parseCFRequestHeaders';

const Api = {
  
  buildSystemMetadata(requestHeaders) {
    return parseCFRequestHeaders(requestHeaders)
    .then(systemMetadata => getGeoInformationFromIp(cfIpAddress)) 
    .then(geoLocationData => omitEmpty(Object.assign({}, updatedMetadata, {
      countryName: geoLocationData.country_name,
      regionCode: geoLocationData.region_code,
      regionName: geoLocationData.region_name,
      city: geoLocationData.city,
      zipCode: geoLocationData.zip_code,
      timeZone: geoLocationData.time_zone,
      location: {
        lat: geoLocationData.latitude,
        lon: geoLocationData.longitude
      },
      metroCode: geoLocationData.metro_code
    })));
  }

  processOpenClickEventsStream(records) { // out
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
