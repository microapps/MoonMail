import { SimpleStatefulRecursiveService } from 'recursive-lambda';
import wait from './lib/utils/wait';
import Api from './Api';

// FIXME: This mixes bussines logic and application logic
export default class ImportRecipientsCsvRecursiveLamda extends SimpleStatefulRecursiveService {
  static async execute(params, lambdaClient, context) {
    const instance = new ImportRecipientsCsvRecursiveLamda(params, lambdaClient, context);
    await instance.execute();
    const state = instance.state;
    if (state.error) throw state.error;
    return state;
  }

  constructor(params, lambdaClient, context) {
    super(params, lambdaClient, context);
    this.processingOffset = params.processingOffset;
    this.userId = params.userId;
    this.listId = params.listId;
    this.body = params.body;
    this.headerMapping = params.headerMapping;
    this.fileName = params.fileName;
    this.s3Event = params.s3Event;
    this.blacklistedRecipients = params.blacklistedRecipients;
    this.initState({
      processingOffset: this.processingOffset,
      processCompleted: false
    });
  }

  get batchSize() {
    return 200;
  }

  beforeInvokeLambda() {
    const nextCallParams = Object.assign({}, this.s3Event, { processingOffset: this.state.processingOffset });
    this.updateState(nextCallParams, true);
  }

  get executionInvariant() {
    return !this.state.isOperationAborted && !this.state.processCompleted;
  }

  action(state = {}) {
    if (state.processCompleted) return this.completeExecution();
    return this.importRecipients(this.state);
  }

  async importRecipients(state) {
    try {
      await wait(500);
      const startIndex = state.processingOffset;
      const lastIndex = startIndex + this.batchSize;
      const recipients = await this.getRecipients();
      const recipientsBatch = recipients.slice(startIndex, lastIndex);
      await Api.publishRecipientImportedEvents(recipientsBatch, this.fileName, startIndex, recipients.length);
      return this.updateState({
        recipients,
        processingOffset: lastIndex,
        processCompleted: recipients.length - 1 <= lastIndex
      });
    } catch (error) {
      const errorMessage = error.message || error.errorMessage;
      if (!errorMessage.match(/ImportError/)) throw error;
      return this.updateState({
        processingOffset: 0,
        error,
        processCompleted: true
      });
    }
  }

  getRecipients() {
    if (this.state.recipients) return Promise.resolve(this.state.recipients);
    return Api.mapCsvStringToRecipients({
      csvString: this.body,
      userId: this.userId,
      listId: this.listId,
      headerMapping: this.headerMapping
    }).filter(recipient => !this.blacklistedRecipients.includes(recipient.email));
  }
}

