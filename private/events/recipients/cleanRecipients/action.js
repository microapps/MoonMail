import { strip } from 'eskimo-stripper';
import { logger } from '../../../lib/index';
import { CleanRecipientsEmailService } from '../lib/clean_recipients_email_service';

export default function respond(event, cb) {
  logger().info('= cleanRecipients.action called', JSON.stringify(event));
  const newRecipients = event.Records.filter(record => record.eventName === 'INSERT')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(recipient => !isProcessed(recipient));

  const updatedRecipients = event.Records.filter(record => record.eventName === 'MODIFY')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(recipient => !isProcessed(recipient));

  CleanRecipientsEmailService.cleanUpdateAndNotify(newRecipients)
    .then(() => CleanRecipientsEmailService.cleanAndUpdate(updatedRecipients))
    .then(data => cb(null, data))
    .catch((error) => {
      logger().error(error);
      cb(error);
    });
}

function isProcessed(recipient) {
  logger().info('Analyzing recipient:', JSON.stringify(recipient));
  return !!recipient.riskScore && recipient.riskScore !== -1;
}
