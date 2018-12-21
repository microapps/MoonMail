import { List } from 'moonmail-models';
import { Recipient } from './moonmail-models/src/models/recipient';
import csvWriter from 'csv-write-stream';
import fs from 'fs';
import moment from 'moment';
import cuid from 'cuid';
import { S3 } from 'aws-sdk';
import { debug } from './index';
import UserNotifier from './user_notifier';

const bucketName = process.env.EXPORTS_BUCKET_NAME;
const s3bucket = new S3({ params: { Bucket: bucketName } });

export default class ExportListService {

  static export(listId, userId, fields) {
    return new ExportListService(listId, userId, fields).export();
  }

  constructor(listId, userId, fields) {
    this.listId = listId;
    this.userId = userId;
    this.fields = fields || undefined
    this.csvFile = csvWriter({ headers: fields });
    this.csvPath = '/tmp/out.csv';
    this.csvFile.pipe(fs.createWriteStream(this.csvPath));
    this.s3ObjectKey = `${cuid()}-${listId}.csv`;
  }

  export() {
    debug('= ExportListService.export', this.userId, this.listId);
    return List.get(this.userId, this.listId)
      .then(list => this._checkNoExportPending(list))
      .then(list => this._createExport(list))
      .then(() => this._writeRecipients())
      .then(() => this._readFile())
      .then(data => this._uploadToS3(data))
      .then(() => this._getFileUrl())
      .then(url => this._completeExport(url))
      .catch(err => this._errorHandler(err));
  }

  _checkNoExportPending(list) {
    return new Promise((resolve, reject) => {
      debug('= ExportListService._checkNoExportPending', list);
      const listExports = list.exports || {};
      const pending = Object.keys(listExports).filter(key => (listExports[key].status && listExports[key].status === 'pending'));
      if (pending.length > 0) return reject('There are exports in progress');
      else return resolve(list);
    });
  }

  _createExport(list) {
    const listExports = list.exports || {};
    listExports[this.s3ObjectKey] = { status: 'pending', createdAt: moment().unix() };
    return List.update({ exports: listExports }, this.userId, this.listId);
  }

  _completeExport(url) {
    return List.get(this.userId, this.listId)
      .then(list => this._doCompleteExport(list, url))
      .then(list => this._notifyUser(true, list));
  }

  _doCompleteExport(list, url) {
    const listExports = list.exports || {};
    listExports[this.s3ObjectKey].url = url;
    listExports[this.s3ObjectKey].status = 'success';
    listExports[this.s3ObjectKey].finishedAt = moment().unix();
    return List.update({ exports: listExports }, this.userId, this.listId);
  }

  _errorHandler(err) {
    debug('= ExportListService._errorHandler', err);
    return List.get(this.userId, this.listId)
      .then(list => this._exportFailed(list, err))
      .then(list => this._notifyUser(false, list))
      .then(() => err);
  }

  _exportFailed(list, err) {
    const listExports = list.exports || {};
    if (listExports[this.s3ObjectKey]) {
      listExports[this.s3ObjectKey].status = 'failed';
      listExports[this.s3ObjectKey].finishedAt = moment().unix();
      return List.update({ exports: listExports }, this.userId, this.listId);
    }
  }

  _writeRecipients(previousBatch) {
    if (!!previousBatch && !previousBatch.nextPage) {
      return this.csvFile.end();
    } else {
      return this._fetchRecipients(previousBatch)
        .then(recipients => this._recipientsToCSV(recipients))
        .then(recipients => this._writeRecipients(recipients));
    }
  }

  _readFile() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.csvPath, 'utf8', (err, data) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  }

  _uploadToS3(data) {
    const params = { Bucket: bucketName, Key: this.s3ObjectKey, Body: data };
    return s3bucket.putObject(params).promise();
  }

  _getFileUrl() {
    return new Promise((resolve, reject) => {
      const params = { Bucket: bucketName, Key: this.s3ObjectKey };
      const url = s3bucket.getSignedUrl('getObject', params);
      resolve(url);
    });
  }

  _recipientsToCSV(recipients = {}) {
    const promises = recipients.items.map(recipient => this._writeRecipient(recipient));
    return Promise.all(promises)
      .then(() => recipients);
  }

  _writeRecipient(recipient = {}) {
    return new Promise((resolve) => {
      if (recipient.systemMetadata && recipient.systemMetadata.location) {
        recipient.systemMetadata.lat = recipient.systemMetadata.location.lat
        recipient.systemMetadata.lon = recipient.systemMetadata.location.lon
        delete recipient.systemMetadata.location
      }
      return this.csvFile.write(Object.assign({}, { email: recipient.email }, recipient.metadata, { status: recipient.status }, recipient.systemMetadata), () => {
        return resolve(true);
      });
    });
  }

  _fetchRecipients(previousBatch = {}) {
    const options = { limit: 1000, filters: { status: { eq: 'subscribed' } } };
    if (previousBatch.nextPage) options.page = previousBatch.nextPage;
    return Recipient.allByListId(this.listId, options);
  }

  _notifyUser(success = true, list) {
    const type = success ? 'LIST_EXPORT_SUCCEEDED' : 'LIST_EXPORT_FAILED';
    return UserNotifier.notify(this.userId, { type, data: list });
  }

}
