import Promise from 'bluebird';
import { User } from '../../../../lib/models/user';
import { SesWrapper } from './ses_wrapper';
import { debug } from '../../../../lib/index';

class GenerateDomainVerificationTokensService {

  static generate(userId, senderId) {
    return new GenerateDomainVerificationTokensService(userId, senderId)
      .generate();
  }

  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  generate() {
    debug('= GenerateDomainVerificationTokensService.generate', this.userId, this.senderId);
    return User.fetchSender(this.userId, this.senderId, true, false)
      .then(sender => this._generateTokens(sender));
  }

  _generateTokens(sender) {
    debug('= GenerateDomainVerificationTokensService._generateTokens', JSON.stringify(sender));
    const domain = sender.emailAddress.split('@')[1];
    return this._verifyDomain(domain);
  }

  _verifyDomain(domain) {
    return SesWrapper.get(this.userId, this.senderId)
      .then(sesClient => sesClient.verifyDomainIdentity({ Domain: domain }).promise());
  }

}

module.exports.GenerateDomainVerificationTokensService = GenerateDomainVerificationTokensService;
