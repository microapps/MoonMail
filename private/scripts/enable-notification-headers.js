import AWS from 'aws-sdk';
import omitEmpty from 'omit-empty';
import _ from 'lodash/fp';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

const stage = 'prod';
const settings = {
  dev: { region: 'us-east-1', tableName: 'MoonMail-v2-dev-users', profile: 'personal' },
  prod: { region: 'eu-west-1', tableName: 'MoonMail-v2-prod-users', profile: 'moonmail-deployer' }
};

function recursiveScan(tableName, exclusiveStartKey = {}) {
  const credentials = new AWS.SharedIniFileCredentials({ profile: settings[stage].profile });
  AWS.config.credentials = credentials;
  const dynamoConfig = { region: settings[stage].region };
  const db = new AWS.DynamoDB.DocumentClient(dynamoConfig);
  const scanParams = omitEmpty({
    TableName: settings[stage].tableName,
    ExclusiveStartKey: exclusiveStartKey
  });
  return db.scan(scanParams).promise()
    .then((result) => {
      if (result.LastEvaluatedKey) return recursiveScan(tableName, result.LastEvaluatedKey).then(items => result.Items.concat(items));
      return result.Items;
    });
}

function getSesSendersPairs(users) {
  return _.pipe(
    _.filter(_.has('ses')),
    _.filter(_.has('senders')),
    _.map(_.pick(['ses', 'senders']))
  )(users);
}

function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function enableHeaders(sesSendersPairs) {
  const notificationTypes = ['Bounce', 'Complaint'];
  const flatSesSender = _.flatMap(
    pair => _.map(s => [pair.ses, s], pair.senders),
    sesSendersPairs
  );
  const flatSesSenderNotification = _.flatMap(
    pair => _.map(n => [...pair, n], notificationTypes),
    flatSesSender
  );
  return Promise.map(flatSesSenderNotification, ([ses, sender, notificationType], index, total) => {
    const sesClient = new AWS.SES({ accessKeyId: ses.apiKey, secretAccessKey: ses.apiSecret, region: ses.region });
    const params = { Identity: sender.emailAddress, NotificationType: notificationType, Enabled: true };
    console.log(index, 'of', total);
    return wait(500)
      .then(() => sesClient.setIdentityHeadersInNotificationsEnabled(params).promise())
      .catch(error => ({ ses, sender, error }));
  }, { concurrency: 2 });
}

recursiveScan(settings[stage].tableName)
  .then(users => getSesSendersPairs(users))
  .then(pairs => enableHeaders(pairs))
  .then((res) => {
    const errored = _.filter(_.has('error'), res);
    console.log('Errored:', errored.length, 'of', res.length);
    fs.writeFileSync(path.resolve(__dirname, 'errors.log'), JSON.stringify(errored));
  })
  .catch(console.log);

