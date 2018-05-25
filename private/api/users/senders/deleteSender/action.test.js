import * as chai from 'chai';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import { respond } from './action';
import { User } from '../../../../lib/models/user';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';

const expect = chai.expect;
chai.use(sinonChai);

describe('deleteSender', () => {
  const userId = 'my-user-id';
  const senderId = 'sender-id';
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
        event = { senderId };
        sinon.stub(User, 'deleteSender').resolves(true);
      });

      it('should update the sender', done => {
        respond(event, (err, result) => {
          expect(err).not.to.exist;
          expect(User.deleteSender).to.have.been.calledWithExactly(userId, senderId);
          done();
        })
      });
      after(() => {
        User.deleteSender.restore();
      });
    });

    after(() => {
      decrypt.default.restore();
    });
  });
});
