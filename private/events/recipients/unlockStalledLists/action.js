import omitEmpty from 'omit-empty';
import moment from 'moment';
import { List } from 'moonmail-models';
import Promise from 'bluebird';
import AWS from 'aws-sdk';
import { logger } from '../../../lib/index';

function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function recursiveScan(exclusiveStartKey = {}) {
  const db = new AWS.DynamoDB.DocumentClient();
  const scanParams = omitEmpty({
    TableName: process.env.LISTS_TABLE,
    ExclusiveStartKey: exclusiveStartKey
  });
  return db
    .scan(scanParams)
    .promise()
    .then((result) => {
      if (result.LastEvaluatedKey) {
        return wait(50)
          .then(() => recursiveScan(result.LastEvaluatedKey))
          .then(items => result.Items.concat(items));
      }
      return result.Items;
    });
}

function unlockStalledLists() {
  return recursiveScan().then(items =>
    Promise.map(
      items,
      (list) => {
        if (!list.importStatus || list.processed || !list.total) return Promise.resolve();

        const createdDates = Object.keys(list.importStatus).reduce(
          (acc, current) => {
            acc.push(list.importStatus[current].createdAt);
            return acc;
          },
          []
        );
        const [lastImport] = createdDates.sort().slice(-1);
        if (!lastImport) return Promise.resolve();
        const fifteenMinutesDelay = moment.unix(lastImport).add(15, 'minutes');
        if (moment().isSameOrAfter(fifteenMinutesDelay)) {
          logger().error('List unlocked', list);
          return List.update({ processed: true }, list.userId, list.id);
        }
        return Promise.resolve();
      },
      { concurrency: 1 }
    )
  );
}

export default function respond(event, cb) {
  logger().info('= unlockStalledLists.action called', JSON.stringify(event));
  unlockStalledLists()
    .then(() => cb(null, {}))
    .catch((error) => {
      logger().error(error);
      cb(error);
    });
}
