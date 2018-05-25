import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import AmazonSubscriptions from '../lib/amazon_subscriptions';
import respond from './action';

const expect = chai.expect;

describe('respond()', () => {
  const signupUrl = 'https://app.moonmail.io/signin';
  const registrationToken = 'the-token';
  const resolvedCustomer = {CustomerIdentifier: 'customer-id'};

  before(() => {
    process.env.SIGNUP_URL = signupUrl;
    sinon.stub(AmazonSubscriptions, 'resolveCustomer')
      .withArgs(registrationToken).resolves(resolvedCustomer)
      .withArgs(sinon.match.any).rejects(new Error('Amazon Error'));
  });
  after(() => {
    delete process.env.SIGNUP_URL;
    AmazonSubscriptions.resolveCustomer.restore();
  });

  context('when the provided token is correct', () => {
    const event = {registrationToken};

    it('should redirect to signup page with customerId parameter', (done) => {
      const url = `${signupUrl}?amazonCustomerId=${resolvedCustomer.CustomerIdentifier}`;
      const expected = {url};
      respond(event, (err, res) => {
        expect(err).not.to.exist;
        expect(res).to.deep.equal(expected);
        done();
      });
    });
  });

  context('when the provided token is not correct', () => {
    const event = {registrationToken: 'wrong-token'};

    it('should redirect to signup page with no extra parameter', (done) => {
      const expected = {url: signupUrl};
      respond(event, (err, res) => {
        expect(err).not.to.exist;
        expect(res).to.deep.equal(expected);
        done();
      });
    });
  });
});
