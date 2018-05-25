import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import { GetUserAccountService } from '../../api/users/account/lib/get_user_account_service';
import UpdateStripeSubscriptionService from './update_stripe_subscription_service';
import { User } from '../models/user';
import SES from '../ses/index';
import Subscriptions from './index';
import CancelStripeSubscriptionService from './cancel_stripe_subscription_service';
import CreateStripeCustomerService from './create_stripe_customer_service';
import CreateStripeSubscriptionService from './create_stripe_subscription_service';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Subscriptions', () => {
  describe('updates user subscription accordingly', () => {
    before(() => {
      sinon.stub(SES, 'assignCredentials').resolves({});
      sinon.stub(GetUserAccountService, 'userToAccount').resolves({});
    });
    after(() => {
      SES.assignCredentials.restore();
      GetUserAccountService.userToAccount.restore();
    });
    context('when the goto plan is free', () => {
      const userId = 'user-id';
      const subscriptionId = 'subscription-id';
      const customerId = 'customer-id';
      const plan = 'pro';
      const email = 'email@example.com';
      const subscriptionType = 'monthly';
      const user = { id: userId, email, plan, stripeAccount: { subscriptionId, customerId } };
      before(() => {
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'updatePlan').resolves({});
        sinon.stub(CancelStripeSubscriptionService, 'cancel').resolves({});
      });
      after(() => {
        User.get.restore();
        User.updatePlan.restore();
        CancelStripeSubscriptionService.cancel.restore();
      });
      it('cancels the stripe subscription and updates plan to free', (done) => {
        Subscriptions.updateUserSubscription(userId, 'free', subscriptionType, '1234', '1234').then((userAccount) => {
          expect(CancelStripeSubscriptionService.cancel).to.have.been.called;
          expect(User.updatePlan.lastCall.args).to.deep.equals([userId, 'free']);
          done();
        }).catch(error => done(error));
      });
    });

    context('when the goto plan a paid one', () => {
      context('and the user has an active subscription', () => {
        const userId = 'user-id';
        const subscriptionId = 'subscription-id';
        const customerId = 'customer-id';
        const plan = 'pro';
        const email = 'email@example.com';
        const subscriptionType = 'monthly';
        const user = { id: userId, email, plan, stripeAccount: { subscriptionId, customerId } };
        before(() => {
          sinon.stub(User, 'get').resolves(user);
          sinon.stub(User, 'updatePlan').resolves({});
          sinon.stub(UpdateStripeSubscriptionService, 'update').resolves({});
        });
        after(() => {
          User.get.restore();
          User.updatePlan.restore();
          UpdateStripeSubscriptionService.update.restore();
        });
        it('updates the stripe subscription plan', (done) => {
          Subscriptions.updateUserSubscription(userId, 'enterprise', subscriptionType, '1234', '1234').then((userAccount) => {
            expect(UpdateStripeSubscriptionService.update).to.have.been.called;
            expect(User.updatePlan.lastCall.args).to.deep.equals([userId, 'enterprise']);
            done();
          }).catch(error => done(error));
        });
      });

      context('and the user has no active subscription and customer', () => {
        context('an upgrade is requested', () => {
          const userId = 'user-id';
          const subscriptionId = 'subscription-id';
          const customerId = 'customer-id';
          const plan = 'free';
          const email = 'email@example.com';
          const subscriptionType = 'monthly';
          const user = { id: userId, email, plan };
          before(() => {
            sinon.stub(User, 'get').resolves(user);
            sinon.stub(User, 'updatePlan').resolves({});
            sinon.stub(CreateStripeCustomerService, 'create').resolves({ customerId });
            sinon.stub(CreateStripeSubscriptionService, 'create').resolves({ subscriptionId });
          });
          after(() => {
            User.get.restore();
            User.updatePlan.restore();
            CreateStripeCustomerService.create.restore();
            CreateStripeSubscriptionService.create.restore();
          });
          it('creates a customer and a subscription', (done) => {
            Subscriptions.updateUserSubscription(userId, 'enterprise', subscriptionType, '1234', '1234').then((userAccount) => {
              expect(CreateStripeCustomerService.create).to.have.been.called;
              expect(CreateStripeSubscriptionService.create).to.have.been.called;
              expect(User.updatePlan.lastCall.args).to.deep.equals([userId, 'enterprise']);
              done();
            }).catch(error => done(error));
          });
        });

        context('but a downgrade is requested', () => {
          const userId = 'user-id';
          const subscriptionId = 'subscription-id';
          const customerId = 'customer-id';
          const plan = 'free';
          const email = 'email@example.com';
          const subscriptionType = 'monthly';
          const user = { id: userId, email, plan };
          before(() => {
            sinon.stub(User, 'get').resolves(user);
            sinon.stub(User, 'updatePlan').resolves({});
            sinon.stub(CreateStripeCustomerService, 'create').resolves({ customerId });
            sinon.stub(CreateStripeSubscriptionService, 'create').resolves({ subscriptionId });
          });
          after(() => {
            User.get.restore();
            User.updatePlan.restore();
            CreateStripeCustomerService.create.restore();
            CreateStripeSubscriptionService.create.restore();
          });
          it('does nothing', (done) => {
            Subscriptions.updateUserSubscription(userId, 'free', subscriptionType, '', '').then((userAccount) => {
              expect(CreateStripeCustomerService.create).not.to.have.been.called;
              expect(CreateStripeSubscriptionService.create).not.to.have.been.called;
              expect(User.updatePlan).not.to.have.been.called;
              done();
            }).catch(error => done(error));
          });
        });
      });
    });
  });
});
