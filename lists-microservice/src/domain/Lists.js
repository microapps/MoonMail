import moment from 'moment';
import ListImportStatus from './ListImportStatus';
import ListModel from './ListModel';

function allRecursive(userId, options) {
  return ListModel.allBy('userId', userId, Object.assign({}, options, { recursive: true }));
}

function allBy(userId, options) {
  return ListModel.allBy('userId', userId, options);
}

function setImportingStarted(userId, listId, importId) {
  return Lists.updateImportStatus(userId, listId, importId, { status: 'importing', createdAt: moment().unix() })
    .then(() => setProcessing(userId, listId, true));
}

function setAsProcessed(userId, listId) {
  return setProcessing(userId, listId, false);
}

async function updateImportStatus(userId, listId, importId, { status, message, createdAt, finishedAt }) {
  const list = await ListModel.find(userId, listId);
  const existingImportStatus = list.importStatus;
  const newImportStatus = ListImportStatus.aggregateImportStatus(importId, existingImportStatus, { status, message, createdAt, finishedAt });
  return ListModel.update({ importStatus: newImportStatus }, userId, listId);
}

function setProcessing(userId, listId, processing) {
  return ListModel.update({ processed: !processing }, userId, listId);
}

function updateMetadataAttrsAndImportStatusFromEvents(recipientImportedEvents, importStatusListener = null) {
  const importedRecipientEventsByListId = recipientImportedEvents.reduce((result, current) => {
    const { recipient } = current.payload;
    const { listId } = recipient;
    if (!result[listId]) {
      result[listId] = [];
    }
    result[listId].push(current);
    return result;
  }, {});

  return Promise.map(Object.keys(importedRecipientEventsByListId), (listId) => {
    const listRecipientEvents = importedRecipientEventsByListId[listId];
    // Take the last one
    const [sampleRecipientImportedEvent] = listRecipientEvents.slice(-1);

    const { recipient, importId, recipientIndex, totalRecipients } = sampleRecipientImportedEvent.payload;
    const importStatus = ListImportStatus.buildFromImportProgress({ recipientIndex, totalRecipients });
    return Lists.updateImportStatus(recipient.userId, listId, importId, importStatus)
      .then(() => ListModel.appendMetadataAttributes(Object.keys(recipient.metadata || {}), { userId: recipient.userId, listId }))
      .then(() => (importStatusListener ? importStatusListener({ listId, userId: recipient.userId, importStatus }) : { listId, userId: recipient.userId, importStatus }));
  });
}

const Lists = {
  create: ListModel.create,
  update: ListModel.update,
  delete: ListModel.delete,
  find: ListModel.find,
  all: allBy,
  allRecursive,
  updateImportStatus,
  setImportingStarted,
  setAsProcessed,
  updateMetadataAttrsAndImportStatusFromEvents
};

export default Lists;
