import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { User } from '../../../lib/models/user';
import handleDeletedSubscription from './handleDeletedSubscription';

const expect = chai.expect;
chai.use(sinonChai);

describe('handleDeletedSubscription', () => {
  let stripeApi;
  const customerId = '1234';
  const customerEmail = 'customer@example.com';
  const targetEvent = {
    eventName: 'INSERT', dynamodb: { NewImage: { eventType: { S: 'customer.subscription.deleted' }, event: { M: { data: { M: { object: { M: { customer: { S: customerId } } } } } } } } }
  };
  const nonTargetEvent1 = { eventName: 'MODIFY' };
  const nonTargetEvent2 = {
    eventName: 'INSERT', dynamodb: { NewImage: { eventType: { S: 'customer.subscription.other' } } }
  };
  const events = { Records: [targetEvent, nonTargetEvent1, nonTargetEvent2] };

  beforeEach(() => {
    stripeApi = nock('https://api.stripe.com');
    stripeApi
      .get(`/v1/customers/${customerId}`)
      .reply(200, {
        email: customerEmail
      });

    sinon.stub(User, 'update').resolves({});
  });

  afterEach(() => {
    nock.cleanAll();
    User.update.restore();
  });

  context('when the user is downgraded already', () => { // this happens in the normal downgrade workflow
    before(() => {
      sinon.stub(User, 'findByEmail').resolves({ plan: 'free' });
    });

    it('does not perform any update', (done) => {
      handleDeletedSubscription(events).then((result) => {
        expect(result).to.exist;
        expect(stripeApi.isDone()).to.be.true;
        expect(User.update).not.to.be.called;
        done();
      }).catch(error => done(error));
    });

    after(() => {
      User.findByEmail.restore();
    });
  });

  context('when the user needs to be downgraded', () => { // this happens in the normal downgrade workflow
    before(() => {
      sinon.stub(User, 'findByEmail').resolves({ plan: 'paid' });
    });

    it('downgrades accordingly', (done) => {
      handleDeletedSubscription(events).then((result) => {
        expect(result).to.exist;
        expect(stripeApi.isDone()).to.be.true;
        expect(User.update).to.be.calledOnce;
        done();
      }).catch(error => done(error));
    });

    after(() => {
      User.findByEmail.restore();
    });
  });
});
