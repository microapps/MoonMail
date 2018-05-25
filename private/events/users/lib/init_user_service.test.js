import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import base64url from 'base64-url';
import { List, Recipient, Campaign, Automation, AutomationAction } from 'moonmail-models';
import InitUserService from './init_user_service';
import Auth0Client from '../../../lib/auth0-client';
import { User } from '../../../lib/models/user';

const expect = chai.expect;
chai.use(sinonChai);

describe('InitUserService', () => {
  describe('.execute()', () => {
    const userId = 'user-id';
    const listId = 'sample-list';
    const campaignId = 'sample-campaign';
    const auth0User = {
      email: 'david.garcia@microapps.com',
      user_id: userId,
      name: 'David García',
      user_metadata: {}
    };
    const campaignBody = 'Campaign body';
    const automationBody = 'Automation body';
    beforeEach(() => {
      sinon.stub(User, 'update')
        .withArgs(sinon.match.any, userId).resolves(true)
        .withArgs(sinon.match.any).rejects(new Error('DB error'));
      sinon.stub(List, 'save')
        .withArgs(sinon.match.any).resolves(true);
      sinon.stub(Recipient, 'save')
        .withArgs(sinon.match.any).resolves(true);
      sinon.stub(Campaign, 'save')
        .withArgs(sinon.match.any).resolves(true);
      sinon.stub(Automation, 'save')
        .withArgs(sinon.match.any).resolves(true);
      sinon.stub(AutomationAction, 'save')
        .withArgs(sinon.match.any).resolves(true);
    });
    afterEach(() => {
      User.update.restore();
      List.save.restore();
      Recipient.save.restore();
      Campaign.save.restore();
      Automation.save.restore();
      AutomationAction.save.restore();
    });

    context('when the user dont have isSesUser attribute in auth0', () => {
      beforeEach(() => {
        sinon.stub(Auth0Client, 'query')
          .withArgs('getUser', { id: userId, fields: ['user_id', 'email', 'name', 'user_metadata'] })
          .resolves(auth0User);
      });
      afterEach(() => {
        Auth0Client.query.restore();
      });
      it('should update user email and name', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const expectedParams = { email: auth0User.email, name: auth0User.name };
        expect(User.update).to.have.been.calledWithExactly(expectedParams, userId);
      });

      it('should create a sample list', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const expected = { userId, id: sinon.match.string, name: 'Sample List', isDeleted: 'false', importStatus: {} };
        expect(List.save).to.have.been.calledWithExactly(expected);
      });

      it('should create three sample recipients', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const emails = [
          'david.garcia@microapps.com',
          'david.garcia+1@microapps.com',
          'david.garcia+2@microapps.com'
        ];
        const buildRecipient = email => ({
          userId,
          listId: sinon.match.string,
          email,
          metadata: { name: sinon.match.string, surname: sinon.match.string },
          id: base64url.encode(email),
          status: Recipient.statuses.subscribed
        });
        const recipients = emails.map(buildRecipient);
        recipients.forEach(recipient => {
          expect(Recipient.save).to.have.been.calledWithExactly(recipient);
        });
      });

      it('should create a sample campaign', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const expected = {
          userId,
          id: sinon.match.string,
          status: 'draft',
          body: campaignBody,
          listIds: [sinon.match.string],
          subject: 'My first MoonMail Campaign - Ecommerce Template',
          name: 'My first MoonMail Campaign - Ecommerce Template'
        };
        expect(Campaign.save).to.have.been.calledWithExactly(expected);
      });

      it('should create a sample automation', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const expected = {
          userId,
          id: sinon.match.string,
          listId: sinon.match.string,
          name: 'My first MoonMail Automation',
          status: 'paused'
        };
        expect(Automation.save).to.have.been.calledWithExactly(expected);
      });

      it('should create a sample automation action', async () => {
        const result = await InitUserService.execute(userId, campaignBody, automationBody);
        const expected = {
          automationId: sinon.match.string,
          delay: 86400,
          footprint: sinon.match.string,
          id: sinon.match.string,
          listId: sinon.match.string,
          name: 'A day after the recipient subscribes to a list',
          status: 'paused',
          campaign: {
            subject: 'This email will be sent out one day after anybody subscribes to the list',
            body: automationBody
          },
          type: 'list.recipient.subscribe',
          userId
        };
        expect(AutomationAction.save).to.have.been.calledWithExactly(expected);
      });
    });

    context('when the user has isSesUser attribute in auth0', () => {
      const auth0User = {
        email: 'carlos.castellanos@microapps.com',
        user_id: userId,
        name: 'David García',
        user_metadata: {
          isSesUser: true
        }
      };
      beforeEach(() => {
        sinon.stub(Auth0Client, 'query')
          .withArgs('getUser', { id: userId, fields: ['user_id', 'email', 'name', 'user_metadata'] })
          .resolves(auth0User);
      });
      afterEach(() => {
        Auth0Client.query.restore();
      });
      it('saves the user\'s plan accordingly', async () => {
        await InitUserService.execute(userId, campaignBody, automationBody);
        const expectedParams = { email: auth0User.email, name: auth0User.name, plan: 'free_ses' };
        expect(User.update).to.have.been.calledWithExactly(expectedParams, userId);
      });
    });
  });
});
