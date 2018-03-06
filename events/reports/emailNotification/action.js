import { parse } from 'aws-event-parser';
import { EmailNotificationService } from '../../lib/email_notification_service';
import { debug } from '../../lib/index';

export function respond(event, cb) {
  debug('= emailNotification.action', JSON.stringify(event));
  const notification = parse(event)[0];
  const emailNotificationService = new EmailNotificationService(notification);
  emailNotificationService.process()
    .then(data => cb(null, data))
    .catch(err => cb(err));
}
