import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { AssignSesCredentialsService } from './assign_ses_credentials_service';
import { NotificationsBus } from '../notifications_bus';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

describe('AssignSesCredentialsService', () => {
  const user = {id: 'user-id', stripeAccount: {}, plan: 'paid', email: 'user@example.com'};
  const service = new AssignSesCredentialsService(user);

  before(() => {
    sinon.stub(NotificationsBus, 'publish').resolves(user);
  });

  describe('#assign', () => {
    context('when no api keys in the pool', () => {
      it('should notify admins if no api keys in the pool', done => {
        const subject = `MoonMail: user ${user.id} has switched to ${user.plan} plan`;
        const message = `The user with Google id ${user.id} and email ${user.email} has switched to the ${user.plan} plan. Please, set/unset API Keys`;
        service.assign().then(result => {
          const topic = 'emailAdmins';
          expect(NotificationsBus.publish).to.have.been.calledWith(topic, message, subject);
          expect(result).to.deep.equal(user);
          done();
        }).catch(done);
      });
    });
  });

  after(() => {
    NotificationsBus.publish.restore();
  });
});
