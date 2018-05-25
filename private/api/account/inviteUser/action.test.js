import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import * as decrypt from '../../../lib/auth-token-decryptor';
import errors from '../../lib/errors';
import { respond } from './action';
import { User } from '../../../lib/models/user';
import Auth0Client from '../../../lib/auth0-client';

const expect = chai.expect;
chai.use(sinonChai);

describe('inviteUser.action', () => {
  const mainUser = {
    id: 'user-id',
    email: 'main@user.com',
    authorizations: [{some: 'stuff'}]
  };
  const mainUserAuth0 = {user_id: mainUser.id, email: mainUser.email, name: 'Mike', picture: 'mike'};
  const invitedUser = {
    id: 'invited-id',
    email: 'invited@user.com',
    impersonations: [{more: 'stuff'}]
  };
  const invitedUserAuth0 = {user_id: invitedUser.id, email: invitedUser.email, name: 'John', picture: 'john'};
  const event = {
    email: invitedUser.email,
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
    sinon.stub(Auth0Client, 'query')
      .withArgs('getUser', {id: mainUser.id, fields: ['user_id', 'email', 'name', 'picture']})
      .resolves(mainUserAuth0)
      .withArgs('getUsers', {q: `email:"${invitedUser.email}"`, fields: ['user_id', 'email', 'name', 'picture']})
      .resolves([invitedUserAuth0]);
  });

  after(() => {
    decrypt.default.restore();
    User.get.restore();
    User.update.restore();
    Auth0Client.query.restore();
  });

  it('exports a function', () => expect(respond).to.be.a('function'));

  it('returns an error when the auth token is invalid', (done) => {
    respond(Object.assign({}, event, {authToken: 'bar'}), err => {
      expect(err).to.deep.equal(JSON.stringify(errors.InvalidToken));
      done();
    });
  });

  context('when the email exists in Auth0', () => {
    it('should add the invited user in the authorizations list', (done) => {
      const authorizations = mainUser.authorizations
        .concat({
          userId: invitedUser.id,
          email: invitedUser.email,
          name: invitedUserAuth0.name,
          picture: invitedUserAuth0.picture});
      respond(event, (err, res) => {
        expect(err).not.to.exist;
        expect(res).to.deep.equal({authorizations});
        expect(User.update).to.have.been.calledWith({authorizations}, mainUser.id);
        done();
      });
    });

    it('should add the main user in the impersonations list', (done) => {
      const impersonations = invitedUser.impersonations
        .concat({
          userId: mainUser.id,
          email: mainUser.email,
          name: mainUserAuth0.name,
          picture: mainUserAuth0.picture
        });
      respond(event, (err) => {
        expect(err).not.to.exist;
        expect(User.update).to.have.been.calledWith({impersonations}, invitedUser.id);
        done();
      });
    });
  });
});
