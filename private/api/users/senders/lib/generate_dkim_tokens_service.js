import Promise from 'bluebird';
import { User } from '../../../../lib/models/user';
import { SesWrapper } from './ses_wrapper';
import { debug } from '../../../../lib/index';

class GenerateDkimTokensService {

  static generate(userId, senderId) {
    return new GenerateDkimTokensService(userId, senderId)
      .generate();
  }

  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  generate() {
    debug('= GenerateDkimTokensService.generate', this.userId, this.senderId);
    return User.fetchSender(this.userId, this.senderId, true, false)
      .then(sender => this._generateDkim(sender));
  }

  _generateDkim(sender) {
    debug('= GenerateDkimTokensService._generateDkim', JSON.stringify(sender));
    const domain = sender.emailAddress.split('@')[1];
    return this._verifyDomainDkim(domain);
  }

  _verifyDomainDkim(domain) {
    return SesWrapper.get(this.userId, this.senderId)
      .then(sesClient => sesClient.verifyDomainDkim({Domain: domain}).promise());
  }

}

module.exports.GenerateDkimTokensService = GenerateDkimTokensService;
