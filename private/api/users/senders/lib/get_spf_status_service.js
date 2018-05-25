import dns from 'dns';
import Promise from 'bluebird';
import { debug } from '../../../../lib/index';

Promise.promisifyAll(dns);
const AMZ_SPF_RECORD = 'v=spf1 include:amazonses.com -all';
const AMZ_SPF_RECORD_2 = 'include:amazonses.com';

class GetSpfStatusService {

  static status(userId, sender) {
    debug('= GetSpfStatusService.status', userId, sender);
    return new GetSpfStatusService(userId, sender)
      .getStatus();
  }

  constructor(userId, sender) {
    this.userId = userId;
    this.sender = sender;
  }

  getStatus() {
    debug('= GetSpfStatusService.getStatus', this.userId, this.sender);
    const domain = this.sender.emailAddress.split('@')[1];
    return dns.resolveAsync(domain, 'TXT')
      .then((records) => {
        const flattenRecords = [].concat(...records);
        const spfRecords = flattenRecords
          .filter(record => record.startsWith('v=spf1'))
          .filter(record => record.indexOf(AMZ_SPF_RECORD) !== -1 || record.indexOf(AMZ_SPF_RECORD_2) !== -1);
        return spfRecords.length > 0 ? Promise.resolve(true) : Promise.resolve(false);
      }).catch(error => Promise.resolve(false));
  }
}

module.exports.GetSpfStatusService = GetSpfStatusService;
