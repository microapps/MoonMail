import * as chai from 'chai';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import { respond } from './action';
import { User } from '../../../../lib/models/user';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';

const expect = chai.expect;
chai.use(sinonChai);

describe('updateSender', () => {

  const email = 'david.garcia@microapps.com';
  const apiKey = 'my-api-key';
  const apiSecret = 'my-api-secret';
  const region = 'us-east-1';
  const sender = { email, apiKey, apiSecret, region };
  const userId = 'my-user-id';
  const senderId = 'sender-id';
  const fromName = 'from-name';
  let event;

  describe('#respond()', () => {
    before(() => {
      sinon.stub(decrypt, 'default').resolves({ sub: userId });
    });

    context('when the event is not valid', () => {
      before(() => {
        event = {};
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    context('when the event is valid', () => {
      before(() => {
        event = { senderId, fromName }
        sinon.stub(User, 'updateSender').resolves(true);
      });
      it('should update the sender', done => {
        respond(event, (err, result) => {
          expect(err).not.to.exist;
          expect(User.updateSender).to.have.been.calledWithExactly(userId, { id: senderId, fromName });
          done();
        })
      });
      after(() => {
        User.updateSender.restore();
      });
    });

    after(() => {
      decrypt.default.restore();
    });
  });
});
