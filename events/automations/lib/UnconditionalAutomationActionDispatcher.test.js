import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import { Recipient } from 'moonmail-models';
import UnconditionalAutomationActionDispatcher from './UnconditionalAutomationActionDispatcher';
import EmailScheduler from './email_scheduler';
import FunctionsClient from '../../lib/functions_client';

const { expect } = chai;
chai.use(sinonChai);

describe('UnconditionalAutomationActionDispatcher', () => {
  describe('#dispatch()', () => {
    const userId = 'userId';
    const senderId = 'sender-id';
    const sender = { id: senderId, emailAddress: 'sender@email.com', fromName: 'From Name' };
    const fetchSenderFunctionName = 'function-name';
    const listId = 'list-id';
    const baseAutomationAction = {
      id: 'automation-action-id',
      automationId: faker.random.alphaNumeric(5),
      userId,
      listId,
      senderId,
      delay: 3600,
      status: 'active',
      campaign: { subject: 'Email subject {{name}}', body: 'Email body {{name}}' },
      name: faker.commerce.productName()
    };

    beforeEach(() => {
      process.env.FETCH_SENDER_FN_NAME = fetchSenderFunctionName;
      sinon.stub(FunctionsClient, 'execute')
        .withArgs(fetchSenderFunctionName, { userId, senderId })
        .resolves(sender);
      sinon.stub(EmailScheduler, 'scheduleBatch').resolves(true);
    });
    afterEach(() => {
      delete process.env.FETCH_SENDER_FN_NAME;
      FunctionsClient.execute.restore();
      EmailScheduler.scheduleBatch.restore();
    });

    context('when the recipient is provided in the event', () => {
      const automationAction = Object.assign(
        {}, baseAutomationAction, { type: 'list.recipient.subscribe' });

      it('should schedule the emails for the events', async () => {
        const events = [
          {
            type: 'list.recipient.subscribe',
            payload: { recipient: { listId: 'list-id', segmentId: 'segment-id', email: '1@moonmail.io', id: 'r-id' } }
          },
          {
            type: 'list.recipient.subscribe',
            payload: { recipient: { listId: 'list-id', email: '2@moonmail.io', id: 'another-recipient-id' } }
          }
        ];
        const expectedEmails = events.map(({ payload }) => ({
          email: {
            body: automationAction.campaign.body,
            subject: automationAction.campaign.subject
          },
          metadata: {
            campaignId: automationAction.id,
            listId: payload.recipient.listId,
            userId: automationAction.userId,
            automationActionId: automationAction.id,
            automationId: automationAction.automationId
          },
          sender,
          recipient: payload.recipient,
          delay: automationAction.delay
        }));
        const dispatcher = new UnconditionalAutomationActionDispatcher(automationAction, events);
        await dispatcher.dispatch();
        expect(EmailScheduler.scheduleBatch).to.have.been.calledWith(expectedEmails);
      });
    });

    context('when the recipient is not provided in the event', () => {
      const automationAction = Object.assign(
        {}, baseAutomationAction, { type: 'email.delivered' });
      const recipient = { id: 'rid', email: '3@moonmail.io', listId };

      before(() => {
        sinon.stub(Recipient, 'get').withArgs(recipient.listId, recipient.id).resolves(recipient);
      });
      after(() => Recipient.get.restore());

      it('fetches it from the Database', async () => {
        const events = [
          {
            type: 'email.delivered',
            payload: { listId: recipient.listId, recipientId: recipient.id, segmentId: 'segment-id', campaignId: 'c-id', id: 'r-id' }
          }
        ];
        const expectedEmails = events.map(({ payload }) => ({
          email: {
            body: automationAction.campaign.body,
            subject: automationAction.campaign.subject
          },
          metadata: {
            campaignId: automationAction.id,
            listId: payload.listId,
            userId: automationAction.userId,
            automationActionId: automationAction.id,
            automationId: automationAction.automationId,
            segmentId: payload.segmentId
          },
          sender,
          recipient,
          delay: automationAction.delay
        }));
        const dispatcher = new UnconditionalAutomationActionDispatcher(automationAction, events);
        await dispatcher.dispatch();
        expect(EmailScheduler.scheduleBatch).to.have.been.calledWith(expectedEmails);
      });
    });
  });
});
