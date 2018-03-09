import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import { Automation } from 'moonmail-models';
import SendAutomationScheduledEmails from './send_automation_scheduled_emails';
import DeliverScheduledEmail from './deliver_scheduled_email';
import { EnqueuedEmail } from '../../lib/enqueued_email';

const expect = chai.expect;
chai.use(sinonChai);
const generateScheduledEmail = (options = {}) => {
  const defaults = {
    campaign: { body: 'Email body', subject: 'Email subject' },
    id: faker.random.alphaNumeric(5),
    recipient: {
      email: 'david.garcia@microapps.com',
      id: faker.random.alphaNumeric(5),
      listId: faker.random.alphaNumeric(5),
      metadata: { name: 'David', surname: 'García' }
    },
    scheduledAt: 1495452351,
    sender: {
      apiKey: faker.random.alphaNumeric(5),
      apiSecret: faker.random.alphaNumeric(5),
      emailAddress: 'david.garcia@microapps.com',
      fromName: 'David',
      id: faker.random.alphaNumeric(5),
      region: 'eu-west-1'
    },
    userId: faker.random.alphaNumeric(5),
    automationId: faker.random.alphaNumeric(5),
    automationActionId: faker.random.alphaNumeric(5)
  };
  return Object.assign({}, defaults, options);
};
const activeAutomation = { id: 1, status: 'active', userId: 1 };
const pausedAutomation = { id: 2, status: 'paused', userId: 2 };

describe('SendAutomationScheduledEmails', () => {
  before(() => {
    sinon.stub(Automation, 'get')
      .withArgs(pausedAutomation.userId, pausedAutomation.id)
      .resolves(pausedAutomation)
      .withArgs(sinon.match.any)
      .resolves(activeAutomation);
  });
  after(() => {
    Automation.get.restore();
  });

  describe('.execute()', () => {
    context('when the automation is paused', () => {
      const scheduledEmails = Array(3).fill().map(() =>
        generateScheduledEmail({
          userId: pausedAutomation.userId,
          automationId: pausedAutomation.id
        })
      );
      before(() => {
        sinon.spy(DeliverScheduledEmail, 'execute');
      });
      after(() => {
        DeliverScheduledEmail.execute.restore();
      });

      it('should not send its emails', async () => {
        await SendAutomationScheduledEmails.execute(scheduledEmails);
        expect(DeliverScheduledEmail.execute).not.to.have.been.called;
      });

      it('should return errored emails as non retryable', async () => {
        const result = await SendAutomationScheduledEmails.execute(scheduledEmails);
        result.forEach((item) => {
          const email = item.email;
          expect(scheduledEmails).to.deep.include(email);
          expect(item).to.have.property('error');
          expect(item).to.have.property('retryable', false);
        });
      });
    });

    context('when the automation is active', () => {
      const scheduledEmails = Array(3).fill().map(() =>
        generateScheduledEmail({
          userId: activeAutomation.userId,
          automationId: activeAutomation.id
        })
      );
      let deliverStub;
      before(() => {
        deliverStub = sinon.stub(DeliverScheduledEmail, 'execute');
        deliverStub.resolves({ email: new EnqueuedEmail(scheduledEmails[0]), messageId: 0 });
      });
      after(() => {
        DeliverScheduledEmail.execute.restore();
      });

      it('should deliver scheduled emails', async () => {
        await SendAutomationScheduledEmails.execute(scheduledEmails);
        expect(DeliverScheduledEmail.execute).to.have.been.calledThrice;
        scheduledEmails.forEach(email => expect(DeliverScheduledEmail.execute)
          .to.have.been.calledWithExactly(email));
      });

      it('should return email deliveries', async () => {
        const result = await SendAutomationScheduledEmails.execute(scheduledEmails);
        const expected = scheduledEmails.map(email => ({ email }));
        expect(result).to.deep.equal(expected);
      });

      context('and there is an error sending the emails', () => {
        const erroredDelivery = { email: 'foo', error: 'bar', retryable: false };
        before(() => {
          deliverStub.resolves(erroredDelivery);
        });

        it('should return the errored deliveries', async () => {
          const result = await SendAutomationScheduledEmails.execute(scheduledEmails);
          const expected = scheduledEmails.map(email => Object.assign({}, erroredDelivery, {email}));
          expect(result).to.deep.equal(expected);
        });
      });
    });
  });
});
