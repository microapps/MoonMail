import { debug } from '../index';
import { User } from '../models/user';
import { Campaign } from 'moonmail-models';

class SendStatisticsService {

  static async statsFor(userId) {
    return await new SendStatisticsService(userId).stats();
  }

  constructor(userId) {
    this.userId = userId;
  }

  async stats() {
    const reports = await User.getReports(this.userId);
    const stats =  this._aggregatedStats(reports);
    const sentCampaigns = (reports || []).length;
    const finalStats = Object.assign(stats, { sentCampaigns });
    debug('= SendStatisticsService.stats', this.userId, finalStats);
    return finalStats;
  }

  async _getCampaignStats() {
    const campaigns = await Campaign.allBy('userId', this.userId, { recursive: true });
    return campaigns.items.filter(c => c.status === 'sent').length;
  }

  _aggregatedStats(reports) {
    const aggregatedReport = reports.reduce((acumm, report) => {
      acumm.sent += report.sentCount || 0;
      acumm.bounced += report.bouncesCount || 0;
      acumm.complaint += report.complaintsCount || 0;
      return acumm;
    }, {sent: 0, bounced: 0, complaint: 0});
    return aggregatedReport;
  }
}

module.exports.SendStatisticsService = SendStatisticsService;
