import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { GetUserAccountService } from './get_user_account_service';
import { User } from '../../../../lib/models/user';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('GetUserAccountService', () => {
  const userId = 'userId';
  const plan = 'paid';
  const sendingQuota = 30000;
  const last4 = 1234;
  const name = 'David García';
  const brand = 'VISA';
  const apiKey = 'public-api-key';
  const reputationData = {
    bounceRate: 0,
    complaintsRate: 0,
    maximumAllowedBounceRate: 5,
    maximumAllowedComplaintsRate: 0.1,
    minimumAllowedReputation: 15,
    reputation: 15,
    sentCampaigns: 0,
    sentEmails: 0,
    totalBounces: 0,
    totalComplaints: 0
  };
  const installedExtensionIds = ['some-extension'];
  const stripeAccount = {
    customerId: 'customer-id',
    expMonth: 2,
    expYear: 2017,
    subscriptionId: 'subscription-id',
    last4,
    brand,
    name
  };
  const unapprovedUser = {
    id: userId,
    plan,
    stripeAccount,
    senders: [{}]
  };
  const authorizations = [{ some: 'stuff' }];
  const impersonations = [{ more: 'stuff' }];
  const vat = 'somevat';
  const user = Object.assign({}, unapprovedUser, { authorizations }, { impersonations },
    { ses: { apiKey: '123', apiSecret: '123', region: 'us-east-1', sendingQuota } }, { reputationData },
    { vat, installedExtensionIds, apiKey });
  const expertUser = Object.assign({}, user, { expertData: { key: 'value' } });
  const amazonUser = Object.assign({}, user, { amazonCustomerId: 'aws', amazonSubscriptionActive: true });
  const pricingRate = 199;

  describe('#getAccount()', () => {
    before(() => process.env.PER_1000_EMAIL_COST_IN_CENTS = pricingRate);
    after(() => delete process.env.PER_1000_EMAIL_COST_IN_CENTS);

    context('when the user exists', () => {
      context('and has SES credentials', () => {
        before(() => sinon.stub(User, 'get').resolves(user));
        it('returns an approved user account', (done) => {
          const expectedAccount = {
            id: userId,
            paymentMethod: { last4, name, brand },
            plan,
            sendingQuota,
            approved: true,
            pricingRate,
            authorizations,
            impersonations,
            reputationData,
            vat,
            installedExtensionIds,
            apiKey
          };
          expect(GetUserAccountService.getAccount(userId)).to.eventually.deep.equal(expectedAccount).notify(done);
        });
        after(() => User.get.restore());
      });

      context('and has not SES credentials', () => {
        before(() => sinon.stub(User, 'get').resolves(unapprovedUser));
        it('returns a non approved user account', (done) => {
          const expectedAccount = {
            id: userId,
            paymentMethod: { last4, name, brand },
            plan,
            approved: false,
            reputationData,
            pricingRate
          };
          expect(GetUserAccountService.getAccount(userId)).to.eventually.deep.equal(expectedAccount).notify(done);
        });
        after(() => User.get.restore());
      });

      context('and has expertData', () => {
        before(() => sinon.stub(User, 'get').resolves(expertUser));
        it('returns a non approved user account', (done) => {
          const expectedAccount = {
            id: userId,
            paymentMethod: { last4, name, brand },
            plan,
            sendingQuota,
            approved: true,
            pricingRate,
            expertData: { key: 'value' },
            authorizations,
            impersonations,
            reputationData,
            vat,
            installedExtensionIds,
            apiKey
          };
          expect(GetUserAccountService.getAccount(userId)).to.eventually.deep.equal(expectedAccount).notify(done);
        });
        after(() => User.get.restore());
      });

      context('and is an AWS Marketplace user', () => {
        before(() => sinon.stub(User, 'get').resolves(amazonUser));
        after(() => User.get.restore());

        it('returns AWS Marketplace details', (done) => {
          const expectedAccount = {
            id: userId,
            paymentMethod: { last4, name, brand },
            plan,
            sendingQuota,
            approved: true,
            pricingRate,
            authorizations,
            impersonations,
            reputationData,
            vat,
            installedExtensionIds,
            amazonCustomerId: amazonUser.amazonCustomerId,
            amazonSubscriptionActive: amazonUser.amazonSubscriptionActive,
            apiKey
          };
          expect(GetUserAccountService.getAccount(userId)).to.eventually.deep.equal(expectedAccount).notify(done);
        });
      });
    });

    context('when the user doesn\'t exist', () => {
      before(() => sinon.stub(User, 'get').resolves({}));

      it('returns a free plan account', (done) => {
        const expectedAccount = { id: userId, plan: 'free' };
        expect(GetUserAccountService.getAccount(userId)).to.eventually.deep.equal(expectedAccount).notify(done);
      });

      after(() => User.get.restore());
    });
  });
});
