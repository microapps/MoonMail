import { User } from './models/user';

class GetUserAccountService {
 static getAccount(userId) {
   return User.get(userId)
     .then(user => this.userToAccount(userId, user));
 }

 static userToAccount(userId, user = {}) {
   if (user.id && user.plan) {
     return this._buildAccount(user);
   } else {
     return this._buildFreeAccount(userId);
   }
 }

 static _buildAccount(user) {
   const account = {
     id: user.id,
     plan: user.plan,
     sendingQuota: this._getSendingQuota(user),
     paymentMethod: this._getPaymentMethod(user),
     phoneNumber: user.phoneNumber,
     phoneVerified: user.phoneVerified,
     appendFooter: user.appendFooter
   };
   return account;
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

 static _buildFreeAccount(userId) {
   return {id: userId, plan: 'free'};
 }
}

module.exports.GetUserAccountService = GetUserAccountService;
