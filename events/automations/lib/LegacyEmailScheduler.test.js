import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import faker from 'faker';
import sinonChai from 'sinon-chai';
import moment from 'moment';
import { ScheduledEmail } from 'moonmail-models';
import LegacyEmailScheduler from './LegacyEmailScheduler';

const { expect } = chai;
chai.use(sinonChai);

const campaignId = 'campaign-id';
const listId = 'list-id';
const userId = 'user-id';
const senderId = 'sender-id';
const apiHost = 'api.moonmail.io';
const sender = { id: senderId, emailAddress: 'sender@email.com', fromName: 'From Name' };
const automationId = 'automation-id';
const recipientGenerator = (options) => {
  const defaults = {
    email: faker.internet.email(),
    listId: faker.random.alphaNumeric(5),
    id: faker.random.alphaNumeric(5),
    metadata: { name: faker.name.firstName() }
  };
  return Object.assign({}, defaults, options);
};
const emailToScheduleGenerator = (options) => {
  const email = {
    email: {
      subject: 'Email subject {{name}}', body: 'Email body {{name}}'
    },
    metadata: {
      campaignId,
      automationActionId: campaignId,
      automationId,
      listId,
      userId
    },
    sender,
    recipient: recipientGenerator(),
    delay: 60
  };
  return Object.assign({}, email, options);
};

describe('LegacyEmailScheduler', () => {
  describe('.scheduleBatch()', () => {
    beforeEach(() => {
      sinon.stub(ScheduledEmail, 'saveAll').resolves(true);
      process.env.API_HOST = apiHost;
    });
    afterEach(() => {
      ScheduledEmail.saveAll.restore();
      delete process.env.API_HOST;
    });

    context('when an automation is triggered', () => {
      const recipient = recipientGenerator();
      const emailToSchedule = emailToScheduleGenerator({ recipient });

      it('should schedule an email', async () => {
        await LegacyEmailScheduler.scheduleBatch([emailToSchedule]);
        const expectedRecipient = Object.assign(
          {},
          recipient,
          { unsubscribeUrl: sinon.match.string }
        );
        const expectedEmail = {
          id: sinon.match.string,
          scheduledAt: moment().unix() + emailToSchedule.delay,
          userId,
          campaign: sinon.match({ body: sinon.match.string, id: sinon.match.string, subject: sinon.match.string }),
          sender,
          recipient: expectedRecipient,
          status: 'scheduled',
          automationActionId: emailToSchedule.metadata.automationActionId,
          automationId: emailToSchedule.metadata.automationId
        };
        expect(ScheduledEmail.saveAll).to.have.been.calledWithMatch([expectedEmail]);
        const actualCampaign = ScheduledEmail.saveAll.lastCall.args[0][0].campaign;
        expect(actualCampaign.body).to.contain(`Email body ${recipient.metadata.name}`);
        expect(actualCampaign.body).to.contain(`https://${apiHost}/links/open`);
        expect(actualCampaign.subject).to.contain(`Email subject ${recipient.metadata.name}`);
      });
    });

    context('when more than 25 automations are triggered', () => {
      const emails = Array(30).fill().map(() => emailToScheduleGenerator());

      it('should schedule them in batches of 25', async () => {
        await LegacyEmailScheduler.scheduleBatch(emails);
        expect(ScheduledEmail.saveAll).to.have.been.calledTwice;
        const firstCallArgs = ScheduledEmail.saveAll.firstCall.args[0];
        const secondCallArgs = ScheduledEmail.saveAll.lastCall.args[0];
        expect(firstCallArgs.length).to.equal(25);
        expect(secondCallArgs.length).to.equal(5);
      });
    });

    context('when there is an error schdeuling one email', () => {
      const emails = Array(30).fill().map(() => emailToScheduleGenerator());

      beforeEach(() => {
        ScheduledEmail.saveAll.onFirstCall().rejects(new Error('unexpected error'));
      });

      it('should schedule the rest of them', async () => {
        try {
          const res = await LegacyEmailScheduler.scheduleBatch(emails);
          expect(ScheduledEmail.saveAll).to.have.been.calledTwice;
          expect(res).to.exist;
        } catch (err) {
          expect(err).to.not.exist;
        };
      });
    });
  });
});
