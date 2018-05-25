import * as chai from 'chai';
import respond from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import Subscriptions from '../../../lib/subscriptions/index';

const expect = chai.expect;

describe('updateCard', () => {
  let event;
  describe('#respond()', () => {
    before(() => {
      event = { authToken: 'authToken', token: 'card-token' };
      sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' });
      sinon.stub(Subscriptions, 'attachUserCard').resolves({ some: 'thing' });
    });

    it('calls to the attach card service', (done) => {
      respond(event, (err, result) => {
        expect(Subscriptions.attachUserCard).have.been.called;
        expect(result).to.exist;
        expect(err).to.not.exist;
        done();
      });
    });

    after(() => {
      Subscriptions.attachUserCard.restore();
      decrypt.default.restore();
    });
  });
});
