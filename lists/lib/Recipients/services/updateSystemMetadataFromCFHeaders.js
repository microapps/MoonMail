import Recipients from '../Recipients';
import buildSystemMetadata from './buildSystemMetadata';

export default function updateSystemMetadataFromCFHeaders(listId, recipientId, cfHeaders) {
  return Recipients.getRecipient(listId, recipientId)
    .then((recipient) => {
      if (!recipient.id) return Promise.resolve();
      return buildSystemMetadata(cfHeaders)
        .then(systemMetadata => Recipients.updateSystemMetadata(recipient, systemMetadata));
    });
}
