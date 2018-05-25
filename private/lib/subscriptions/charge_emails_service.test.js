import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import ChargeEmailsService from './charge_emails_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ChargeEmailsService', () => {
  const campaign = { subject: 'A subject' };
  const currentState = { recipientsCount: 100, other: { attr: true } };
  let chargeEmailsService;
  const customerId = 'someId';
  const userId = 'user-id';
  const senderData = { sender: 'info' };
  const user = { stripeAccount: { customerId }, plan: 'paid', reputationData: { reputation: 15 } };
  const userWithDiscount = { stripeAccount: { customerId }, customPrice: 50, plan: 'paid' };
  // costPerThousand = '50';
  const costForFirst2000 = 499;

  describe('#perform()', () => {
    before(() => {
      process.env.STRIPE_API_KEY = 'some-key';
      // process.env.PER_1000_EMAIL_COST_IN_CENTS = costPerThousand;
      // process.env.PER_1000_EMAIL_COST_IN_CENTS_FOR_SES = 0.3;
    });

    context('when everything goes fine', () => {
      beforeEach(() => {
        chargeEmailsService = new ChargeEmailsService(userId, campaign, currentState);
        sinon.stub(chargeEmailsService, '_createStripeCharge').resolves({ status: 'succeedded' });
      });

      context('and the user has no custom pricing', () => {
        before(() => sinon.stub(User, 'get').resolves(user));
        context('when the number of recipients is less than 2000', () => {
          it('calls stripe passing the right parameters', (done) => {
            chargeEmailsService.perform(senderData).then(() => {
              const expectedAmount = 499;
              const expectedCurrency = 'usd';
              const expectedCustomer = customerId;
              expect(User.get.lastCall.args[0]).to.equal(userId);
              expect(chargeEmailsService._createStripeCharge.lastCall.args[0]).to.deep.equal({
                amount: expectedAmount,
                currency: expectedCurrency,
                customer: expectedCustomer,
                description: 'Charge for campaign with subject "A subject" with 100 recipient(s)'
              });
              done();
            }).catch(err => done(err));
          });
        });

        context('when the number of recipients is more than 2000', () => {
          it('calls stripe passing the right parameters for the lowest reputation', (done) => {
            chargeEmailsService.recipientsCount = 1000000;
            chargeEmailsService.perform(senderData).then(() => {
              const expectedAmount = 499 + 998 * 199; // 199 => cost per thousand for 15 rep
              const expectedCurrency = 'usd';
              const expectedCustomer = customerId;
              expect(User.get.lastCall.args[0]).to.equal(userId);
              expect(chargeEmailsService._createStripeCharge.lastCall.args[0].amount).to.equal(expectedAmount);
              done();
            }).catch(err => done(err));
          });

          it('calls stripe passing the right parameters for the higher reputation', (done) => {
            user.reputationData.reputation = 98;
            chargeEmailsService.recipientsCount = 1000000;
            chargeEmailsService.perform(senderData).then(() => {
              const expectedAmount = 499 + 998 * 199; // 199 => cost per thousand for users sending less than 50000 emails
              const expectedCurrency = 'usd';
              const expectedCustomer = customerId;
              expect(User.get.lastCall.args[0]).to.equal(userId);
              expect(chargeEmailsService._createStripeCharge.lastCall.args[0].amount).to.equal(expectedAmount);
              done();
            }).catch(err => done(err));
          });
        });

        after(() => User.get.restore());
      });

      context('and the user has custom pricing', () => {
        before(() => sinon.stub(User, 'get').resolves(userWithDiscount));
        context('when the charge exceeds the minimum', () => {
          it('charges according to the app logic', (done) => {
            chargeEmailsService.recipientsCount = 1000000;
            chargeEmailsService.perform(senderData).then(() => {
              const expectedAmount = 499 + 998 * userWithDiscount.customPrice; // 998 = (1000000 - 2000)/1000
              expect(chargeEmailsService._createStripeCharge.lastCall.args[0]).to.have.property('amount', expectedAmount);
              done();
            }).catch(err => done(err));
          });
        });
        after(() => User.get.restore());
      });

      afterEach(() => chargeEmailsService._createStripeCharge.restore());
    });

    context('when some amount of emails are free', () => {
      beforeEach(() => sinon.stub(User, 'get').resolves(user));

      context('and the number of emails to be sent is lower', () => {
        before(() => {
          chargeEmailsService = new ChargeEmailsService(userId, {}, { recipientsCount: 1500 }, 2000);
          sinon.stub(chargeEmailsService, '_createStripeCharge').resolves({ status: 'succeedded' });
        });

        it('should not call stripe', (done) => {
          chargeEmailsService.perform(senderData).then(() => {
            expect(chargeEmailsService._createStripeCharge).not.to.have.been.called;
            done();
          }).catch(done);
        });

        after(() => chargeEmailsService._createStripeCharge.restore());
      });

      context('and the number of emails to be sent is higher', () => {
        before(() => {
          chargeEmailsService = new ChargeEmailsService(userId, { subject: 'A subject' }, { recipientsCount: 3500 }, 2000);
          sinon.stub(chargeEmailsService, '_createStripeCharge').resolves({ status: 'succeedded' });
        });

        it('calls stripe passing the right parameters', (done) => {
          chargeEmailsService.perform(senderData).then(() => {
            const expectedAmount = 499; // There are only 1500 (3500-2000(free)) emails to charge
            const expectedCurrency = 'usd';
            const expectedCustomer = customerId;
            expect(User.get.lastCall.args[0]).to.equal(userId);
            expect(chargeEmailsService._createStripeCharge.lastCall.args[0]).to.deep.equal({
              amount: expectedAmount,
              currency: expectedCurrency,
              customer: expectedCustomer,
              description: 'Charge for campaign with subject "A subject" with 3500 recipient(s)'
            });
            done();
          }).catch(done);
        });

        after(() => chargeEmailsService._createStripeCharge.restore());
      });

      afterEach(() => User.get.restore());
    });

    context('when something was wrong', () => {
      before(() => {
        chargeEmailsService = new ChargeEmailsService(userId, campaign, currentState);
        sinon.stub(chargeEmailsService, '_createStripeCharge').rejects({ name: 'PaymentGatewayError' });
        sinon.stub(User, 'get').resolves(user);
      });

      it('rejects with an error', (done) => {
        chargeEmailsService.perform(senderData).catch((error) => {
          expect(error.name).to.equals('PaymentGatewayError');
          done();
        });
      });

      after(() => {
        chargeEmailsService._createStripeCharge.restore();
        User.get.restore();
      });
    });

    // describe('#_costPerPlan()', () => {
    //   it('returns the price per 1000 emails according to the user plan', () => {
    //     let price = chargeEmailsService._costPerPlan('paid');
    //     expect(price).to.be.equal(process.env.PER_1000_EMAIL_COST_IN_CENTS);
    //     price = chargeEmailsService._costPerPlan('paid_ses');
    //     expect(price).to.be.equal(process.env.PER_1000_EMAIL_COST_IN_CENTS_FOR_SES);
    //   });
    // });
  });
});
