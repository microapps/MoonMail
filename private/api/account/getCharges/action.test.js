import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import Subscriptions from '../../../lib/subscriptions/index';
const expect = chai.expect;

describe('handleSubscription', () => {
  let userChargesHistory;
  let event;


  describe('#respond()', () => {
    before(() => {
      event = { authToken: 'authToken' };
      userChargesHistory = {
        object: 'list',
        url: '/v1/charges',
        has_more: false,
        data: [
          {
            id: 'ch_18ZN0lHWQi1QKLvWmtehjEuJ',
            object: 'charge',
            amount: 999,
            amount_refunded: 0,
            application_fee: null,
            balance_transaction: 'txn_18ZJ2vHWQi1QKLvWjktSx3D2',
            captured: true,
            created: 1469030007,
            currency: 'eur',
            customer: 'cus_8r15PdHrlHqkVO',
            description: null,
            destination: null,
            dispute: null,
            failure_code: null,
            failure_message: null,
            fraud_details: {
            },
            invoice: 'in_18ZN0lHWQi1QKLvWvvhvTCB4',
            livemode: false,
            metadata: {
            },
            order: null,
            paid: true,
            receipt_email: null,
            receipt_number: null,
            refunded: false,
            refunds: {
              object: 'list',
              data: [

              ],
              has_more: false,
              total_count: 0,
              url: '/v1/charges/ch_18ZN0lHWQi1QKLvWmtehjEuJ/refunds'
            },
            shipping: null,
            source: {
              id: 'card_18ZJ2sHWQi1QKLvWSj9m7Fvb',
              object: 'card',
              address_city: null,
              address_country: null,
              address_line1: null,
              address_line1_check: null,
              address_line2: null,
              address_state: null,
              address_zip: null,
              address_zip_check: null,
              brand: 'Visa',
              country: 'US',
              customer: 'cus_8r15PdHrlHqkVO',
              cvc_check: null,
              dynamic_last4: null,
              exp_month: 2,
              exp_year: 2017,
              funding: 'credit',
              last4: '1881',
              metadata: {
              },
              napme: 'Dmitriy Nevzorov',
              tokenization_method: null
            },
            source_transfer: null,
            statement_descriptor: 'moonmail.io',
            status: 'succeeded'
          }
        ]
      };
      sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' });
      sinon.stub(Subscriptions, 'getBillingHistory').resolves(userChargesHistory);
    });

    it('retrieves the billing history for the given user', (done) => {
      respond(event, (err, result) => {
        expect(Subscriptions.getBillingHistory).have.been.called;
        expect(result).to.exist;
        expect(err).to.not.exist;
        done();
      });
    });

    after(() => {
      Subscriptions.getBillingHistory.restore();
      decrypt.default.restore();
    });
  });
});
