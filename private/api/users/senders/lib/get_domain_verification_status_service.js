import { SesWrapper } from './ses_wrapper';
import { debug } from '../../../../lib/index';

class GetDomainVerificationStatusService {

  static status(userId, sender) {
    debug('= GetDomainVerificationStatusService.status', userId, sender);
    return new GetDomainVerificationStatusService(userId, sender)
      .getStatus();
  }

  constructor(userId, sender) {
    this.userId = userId;
    this.sender = sender;
  }

  getStatus() {
    debug('= GetDomainVerificationStatusService.getStatus', this.userId, this.sender);
    const domain = this.sender.emailAddress.split('@')[1];
    return this._getIdentityVerificationAttributes(domain)
      .then((queryResult) => {
        const domainVerificationAttributes = Object.keys(queryResult.VerificationAttributes).length > 0 ? queryResult.VerificationAttributes : { emptyResponse: {} };
        return Promise.resolve(domainVerificationAttributes[Object.keys(domainVerificationAttributes)[0]]);
      });
  }

  _getIdentityVerificationAttributes(domain) {
    debug('= GetDomainVerificationStatusService._getIdentityVerificationAttributes', domain);
    const params = { Identities: [domain] };
    return SesWrapper.getDomainVerificationStatus(this.userId, this.sender.id, params);
  }

}

module.exports.GetDomainVerificationStatusService = GetDomainVerificationStatusService;
