import Stats from '../stats/index';
import { User } from '../models/user';
import { BadReputation } from '../errors';


const defaultLimits = {
  MINIMUM_ALLOWED_REPUTATION: 15,
  MAX_BOUNCE_RATE_PERCENT: 5,
  MAX_COMPLAINT_RATE_PERCENT: 0.1
};
const sesLimits = {
  MINIMUM_ALLOWED_REPUTATION: 5,
  MAX_BOUNCE_RATE_PERCENT: 9,
  MAX_COMPLAINT_RATE_PERCENT: 0.35
};
const perPlanLimits = {
  staff: sesLimits,
  free: defaultLimits,
  paid: defaultLimits,
  free_ses: sesLimits,
  paid_ses: sesLimits,
  pro: defaultLimits,
  pro_ses: sesLimits,
  enterprise: defaultLimits,
  enterprise_ses: sesLimits,
  aws_saas_marketplace_basic: sesLimits,
  aws_saas_marketplace_pro: sesLimits
};

class ReputationManagementService {

  static async build(userId, limitsPerPlan) {
    return await new ReputationManagementService(userId, Stats, limitsPerPlan).build();
  }

  static async buildAndUpdate(userId, limitsPerPlan) {
    return await new ReputationManagementService(userId, Stats, limitsPerPlan).buildAndUpdate();
  }

  static async validate(userId, limitsPerPlan) {
    try {
      const reputation = await this.buildAndUpdate(userId, limitsPerPlan);
      if (reputation.reputation < reputation.minimumAllowedReputation) {
        return Promise.reject(new BadReputation('Bad reputation'));
      }
      return Promise.resolve(reputation);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  constructor(userId, sendStatisticsService, limitsPerPlan = perPlanLimits) {
    this.userId = userId;
    this.sendStatisticsService = sendStatisticsService;
    this.limitsPerPlan = limitsPerPlan;
  }

  async build() {
    const stats = await this.sendStatisticsService.sendStats(this.userId);
    let bouncedRate = 0.0;
    let complaintRate = 0.0;

    if (stats.sent > 0) {
      bouncedRate = stats.bounced / stats.sent * 100;
      complaintRate = stats.complaint / stats.sent * 100;
    }
    const sentEmails = stats.sent;
    const sentCampaigns = stats.sentCampaigns;

    const user = await User.get(this.userId);
    const limits = this._getLimits(user);

    const reputation = this._calculateReputation(bouncedRate, complaintRate, sentEmails, sentCampaigns, limits);

    return {
      totalBounces: stats.bounced,
      totalComplaints: stats.complaint,
      bounceRate: bouncedRate,
      complaintsRate: complaintRate,
      sentEmails,
      sentCampaigns,
      reputation,
      maximumAllowedBounceRate: limits.MAX_BOUNCE_RATE_PERCENT,
      maximumAllowedComplaintsRate: limits.MAX_COMPLAINT_RATE_PERCENT,
      minimumAllowedReputation: limits.MINIMUM_ALLOWED_REPUTATION
    };
  }

  async buildAndUpdate() {
    let user = await User.get(this.userId);
    const reputation = await this.build();
    const newUser = Object.assign(user, { reputationData: reputation });
    user = await User.update(newUser, this.userId);
    return user.reputationData;
  }

  _calculateReputation(bounceRate, complaintsRate, sentEmails, sentCampaigns, limits) {
    const howCloseToBouceRateThreshold = bounceRate / limits.MAX_BOUNCE_RATE_PERCENT * 100;
    const howCloseToComplaintsRateThreshold = complaintsRate / limits.MAX_COMPLAINT_RATE_PERCENT * 100;
    let penalties;
    if (sentEmails <= 2000) {
      penalties = 85;
    } else {
      penalties = Math.max(howCloseToBouceRateThreshold, howCloseToComplaintsRateThreshold);
    }
    // Rewards: 0 For now, sentCampaigns, sentEmails and daysSinceSignUp could be used here.
    // const rewards = 0.0;
    return Math.max(0, 100 - penalties);
  }

  _getLimits(user = {}) {
    const limits = this.limitsPerPlan[user.plan || 'free'];
    return limits ? limits : defaultLimits;
  }
}

module.exports.ReputationManagementService = ReputationManagementService;