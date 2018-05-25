import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import validEvent from './fixtures/validEvent.json';
import customer from './fixtures/customer.json';
import processStripeWebhook from './processStripeWebhook';
import { PaymentLog } from '../../../lib/models/payment_log';

const expect = chai.expect;
chai.use(sinonChai);

describe('processStripeWebhook', () => {
  let stripeApi;
  const eventId = validEvent.id;
  const customerId = customer.id;
  const customerReferredOf = customer.metadata.referredOf;

  before(() => {
    stripeApi = nock('https://api.stripe.com');
    stripeApi
      .get(`/v1/events/${eventId}`)
      .times(2)
      .reply(200, validEvent);
    stripeApi
      .get(`/v1/customers/${customerId}`)
      .reply(200, customer);
  });

  after(() => {
    nock.cleanAll();
  });


  context('when the stripe event the event was seen before', () => {
    before(() => {
      sinon.stub(PaymentLog, 'get').resolves({ id: eventId });
      sinon.stub(PaymentLog, 'save').resolves({});
    });
    after(() => {
      PaymentLog.get.restore();
      PaymentLog.save.restore();
    });
    it('skips saving it', (done) => {
      processStripeWebhook({ id: eventId }).then((result) => {
        expect(result).to.exist;
        expect(PaymentLog.save).not.to.be.called;
        done();
      }).catch(error => done(error));
    });
  });

  context('the charged customer has a referredOf id (conversion from an aff link)', () => {
    before(() => {
      sinon.stub(PaymentLog, 'get').resolves({});
      sinon.stub(PaymentLog, 'save').resolves({});
    });
    after(() => {
      PaymentLog.get.restore();
      PaymentLog.save.restore();
    });
    it('Stores a affiliate ref at payment log level', (done) => {
      processStripeWebhook({ id: eventId }).then((result) => {
        expect(result).to.exist;
        expect(PaymentLog.save.lastCall.args[0].affiliateRef).to.equal(customerReferredOf);
        done();
      }).catch(error => done(error));
    });
  });
});
