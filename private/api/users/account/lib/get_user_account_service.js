import omitEmpty from 'omit-empty';
import { User } from '../../../../lib/models/user';
import ReputationControls from '../../../../lib/reputation/index';

class GetUserAccountService {
  static getAccount(userId) {
    return User.get(userId)
      .then(user => this.userToAccount(userId, user));
  }

  static userToAccount(userId, user = {}) {
    if (user.id) {
      return this._buildAccount(user);
    } else {
      return this._buildFreeAccount(userId);
    }
  }

  static _buildAccount(user) {
    const account = {
      id: user.id,
      appendFooter: user.appendFooter,
      plan: user.plan || 'free',
      sendingQuota: this._getSendingQuota(user),
      paymentMethod: this._getPaymentMethod(user),
      approved: this._isApproved(user),
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      ses: this._getSesCreds(user),
      address: user.address,
      expertData: user.expertData,
      payPalEmail: user.payPalEmail,
      affiliateId: user.affiliateId,
      referralLink: user.referralLink,
      reputationData: user.reputationData || {
        totalBounces: 0,
        sentEmails: 0,
        minimumAllowedReputation: 15,
        maximumAllowedBounceRate: 5,
        reputation: 15,
        sentCampaigns: 0,
        bounceRate: 0,
        complaintsRate: 0,
        totalComplaints: 0,
        maximumAllowedComplaintsRate: 0.1
      },
      pricingRate: parseInt(this._getPricing(user)),
      authorizations: user.authorizations,
      impersonations: user.impersonations,
      vat: user.vat,
      installedExtensionIds: user.installedExtensionIds,
      amazonCustomerId: user.amazonCustomerId,
      amazonSubscriptionActive: user.amazonSubscriptionActive,
      apiKey: user.apiKey,
      installedTemplates: user.installedTemplates,
      notifications: user.notifications
    };
    return omitEmpty(account);
  }

  static _getPricing(user) {
    if (user.customPrice) return user.customPrice;
    const reputationData = user.reputationData || {};
    return ReputationControls.emailCostsPerReputation(reputationData.reputation || 15, reputationData.sentEmails || 0);
  }

  static _getSesCreds(user) {
    const planRegex = /\w*_ses$/;
    if (user.plan && user.plan.match(planRegex) && user.ses) {
      return { apiKey: user.ses.apiKey, region: user.ses.region };
    }
  }

  static _getSendingQuota(user) {
    return user.ses ? user.ses.sendingQuota : null;
  }

  static _getPaymentMethod(user) {
    if (user.stripeAccount) {
      const stripe = user.stripeAccount;
      return {
        brand: stripe.brand,
        last4: stripe.last4,
        name: stripe.name
      };
    }
  }

  static _isApproved(user) {
    const ses = user.ses;
    return Boolean(ses && ses.apiKey && ses.apiSecret && ses.region && ses.sendingQuota);
  }

  static _buildFreeAccount(userId) {
    return { id: userId, plan: 'free' };
  }
}

module.exports.GetUserAccountService = GetUserAccountService;
