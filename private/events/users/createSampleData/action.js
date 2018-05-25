import { strip } from 'eskimo-stripper';
import * as fs from 'fs';
import { logger } from '../../../lib/index';
import InitUserService from '../lib/init_user_service';

export function respond(event, cb) {
  logger().info('= createSampleData', JSON.stringify(event));
  const campaignBody = getSampleEmailBody();
  const automationBody = getSampleEmailBody('automation');
  const newUserIds = event.Records
    .filter(record => record.eventName === 'INSERT')
    .map(record => strip(record.dynamodb.NewImage))
    .reduce((total, user) => {
      try {
        return user.id ? total.concat(user.id) : total;
      } catch(err) {
        return total;
      }
    }, []);
  const initUserPromises = newUserIds.map(userId => InitUserService.execute(userId, campaignBody, automationBody).catch(() => true));
  return Promise.all(initUserPromises)
    .then(() => cb(null, 'ok'))
    .catch(err => {
      logger().error('Error creating sample data:', err);
      cb(null, err);
    });
}

function getSampleEmailBody(type = 'campaign') {
  const files = {
    campaign: 'events/users/createSampleData/templates/sample-campaign.html',
    automation: 'events/users/createSampleData/templates/sample-automation.html'
  };
  return fs.readFileSync(files[type], 'utf8');
}
