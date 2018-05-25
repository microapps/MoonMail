import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import respond from './action';
import { User } from '../../../lib/models/user';

const expect = chai.expect;
chai.use(sinonChai)

describe('getUserContext', () => {
  describe('#respond()', () => {
    const user = { id: 'user-id', apiKey: 'some-key' };

    beforeEach(() => {
      sinon.stub(User, 'findByApiKey').resolves(user);
      sinon.stub(User, 'get').resolves(user);
    });
    afterEach(() => {
      User.findByApiKey.restore();
      User.get.restore();
    });

    context('when the Api Key was provided', () => {
      const event = { apiKey: user.apiKey }

      it('fetches user by Api Key', (done) => {
        respond(event, (err, result) => {
          if (err) done(err);
          expect(User.findByApiKey).to.have.been.calledWith(event.apiKey);
          expect(result).to.deep.equal(user);
          done();
        });
      });
    })

    context('when the user ID was provided', () => {
      const event = { userId: user.id }

      it('fetches user by Api Key', (done) => {
        respond(event, (err, result) => {
          if (err) done(err);
          expect(User.get).to.have.been.calledWith(event.userId);
          expect(result).to.deep.equal(user);
          done();
        });
      });
    })
  });
});
