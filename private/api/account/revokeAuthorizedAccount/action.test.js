import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import * as decrypt from '../../../lib/auth-token-decryptor';
import errors from '../../lib/errors';
import { respond } from './action';
import { User } from '../../../lib/models/user';

const expect = chai.expect;
chai.use(sinonChai);

describe('revokeAuthorizedAccount.action', () => {
  const mainUser = {id: 'user-id', email: 'main@user.com'};
  const invitedUser = {id: 'invited-id', email: 'invited@user.com'};
  mainUser.authorizations = [{userId: 'david'}, {userId: invitedUser.id, email: invitedUser.email}]
  invitedUser.impersonations = [{userId: 'garcia'}, {userId: mainUser.id, email: mainUser.email}]
  const event = {
    userId: invitedUser.id,
    authToken: 'foo'
  };

  before(() => {
    sinon.stub(decrypt, 'default')
      .withArgs('foo').resolves({sub: mainUser.id})
      .withArgs(sinon.match.any).rejects(errors.InvalidToken);
    sinon.stub(User, 'get')
      .withArgs(mainUser.id).resolves(mainUser)
      .withArgs(invitedUser.id).resolves(invitedUser)
      .withArgs(sinon.match.any).rejects(errors.serviceUnavailable);
    sinon.stub(User, 'update')
      .resolves(true);
  });

  after(() => {
    decrypt.default.restore();
    User.get.restore();
    User.update.restore();
  });

  it('exports a function', () => expect(respond).to.be.a('function'));

  it('returns an error when the auth token is invalid', (done) => {
    respond(Object.assign({}, event, {authToken: 'bar'}), err => {
      expect(err).to.deep.equal(JSON.stringify(errors.InvalidToken));
      done();
    });
  });

  it('should remove the user from the authorizations list', (done) => {
    const authorizations = mainUser.authorizations.filter(user => user.userId !== invitedUser.id);
    respond(event, (err, res) => {
      expect(err).not.to.exist;
      expect(res).to.deep.equal({authorizations});
      expect(User.update).to.have.been.calledWith({authorizations}, mainUser.id);
      done();
    });
  });

  it('should remove the main user from the impersonations list', (done) => {
    const impersonations = invitedUser.impersonations.filter(user => user.userId !== mainUser.id);
    respond(event, (err) => {
      expect(err).not.to.exist;
      expect(User.update).to.have.been.calledWith({impersonations}, invitedUser.id);
      done();
    });
  });
});
