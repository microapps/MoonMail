import dns from 'dns';
import Promise from 'bluebird';
import { debug } from '../../../../lib/index';

Promise.promisifyAll(dns);
const DMARC_RECORD = 'v=DMARC1; p=none';

class GetDmarcStatusService {

  static status(userId, sender) {
    debug('= GetDmarcStatusService.status', userId, sender);
    return new GetDmarcStatusService(userId, sender)
      .getStatus();
  }

  constructor(userId, sender) {
    this.userId = userId;
    this.sender = sender;
  }

  getStatus() {
    debug('= GetDmarcStatusService.getStatus', this.userId, this.sender);
    const domain = this.sender.emailAddress.split('@')[1];
    return dns.resolveAsync(`_dmarc.${domain}`, 'TXT')
      .then((records) => {
        const flattenRecords = [].concat(...records);
        const spfRecords = flattenRecords
          .filter(record => record.indexOf(DMARC_RECORD) !== -1);
        return spfRecords.length > 0 ? Promise.resolve(true) : Promise.resolve(false);
      }).catch(error => Promise.resolve(false));
  }
}

module.exports.GetDmarcStatusService = GetDmarcStatusService;
