import { SesWrapper } from './ses_wrapper';
import { debug } from '../../../../lib/index';

class GetDkimStatusService {

  static status(userId, sender) {
    debug('= GetDkimStatusService.status', userId, sender);
    return new GetDkimStatusService(userId, sender)
      .getStatus();
  }

  constructor(userId, sender) {
    this.userId = userId;
    this.sender = sender;
  }

  getStatus() {
    debug('= GetDkimStatusService.getStatus', this.userId, this.sender);
    const domain = this.sender.emailAddress.split('@')[1];
    return this._getIdentityDkimAttributes(domain)
      .then((queryResult) => {
        const dkimAttributes = Object.keys(queryResult.DkimAttributes).length > 0 ? queryResult.DkimAttributes : { emptyResponse: {} };
        return Promise.resolve(dkimAttributes[Object.keys(dkimAttributes)[0]]);
      });
  }

  _getIdentityDkimAttributes(domain) {
    debug('= GetDkimStatusService._getIdentityDkimAttributes', domain);
    const params = { Identities: [domain] };
    return SesWrapper.getDkimStatus(this.userId, this.sender.id, params);
  }

}

module.exports.GetDkimStatusService = GetDkimStatusService;
