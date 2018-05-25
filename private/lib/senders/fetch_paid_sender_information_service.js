import { debug } from '../index';
import { User } from '../models/user';

class FetchPaidSenderInformationService {

  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  getData() {
    debug('= FetchPaidSenderInformationService.getData', 'Getting sender data');
    return User.fetchSender(this.userId, this.senderId);
  }
}

module.exports.FetchPaidSenderInformationService = FetchPaidSenderInformationService;
