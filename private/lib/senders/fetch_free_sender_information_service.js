import { debug } from '../index';

class FetchFreeSenderInformationService {
  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  get freeSendersConfig() {
    return JSON.parse(process.env.FREE_SENDERS_CONFIG);
  }

  getData() {
    debug('= FetchFreeSenderInformationService.getData', 'Getting sender data');
    const sender = (this.freeSendersConfig.senders && this.freeSendersConfig.senders.length > 0)
      ? this._pickRandomSender()
      : this.freeSendersConfig.defaults;
    return Promise.resolve(sender);
  }

  _pickRandomSender() {
    try {
      const randomIndex = Math.floor((Math.random() * this.freeSendersConfig.senders.length));
      return Object.assign(
        {},
        this.freeSendersConfig.defaults,
        this.freeSendersConfig.senders[randomIndex]
      );
    } catch (err) {
      return this.freeSendersConfig.defaults;
    }
  }
}

module.exports.FetchFreeSenderInformationService = FetchFreeSenderInformationService;
