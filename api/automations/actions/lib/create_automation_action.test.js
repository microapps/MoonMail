import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { Automation, AutomationAction } from 'moonmail-models';
import CreateAutomationAction from './create_automation_action';
import FootprintCalculator from './footprint_calculator';

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CreateAutomationAction', () => {
  const validAutomation = {
    id: 'valid',
    name: 'name',
    listId: 'lid',
    senderId: 'sid',
    status: 'active',
    userId: 'uid'
  };
  const invalidAutomation = { id: 'invalid', userId: 'uid', name: 'incomplete' };
  describe('.execute()', () => {
    beforeEach(() => {
      sinon.stub(Automation, 'get')
        .withArgs(validAutomation.userId, validAutomation.id)
        .resolves(validAutomation)
        .withArgs(invalidAutomation.userId, invalidAutomation.id)
        .resolves(invalidAutomation)
        .withArgs(sinon.match.any).resolves({});
    });
    afterEach(() => {
      Automation.get.restore();
    });

    context('when the automation is invalid', () => {
      const automationId = invalidAutomation.id;
      const { userId } = invalidAutomation;

      it('should reject the promise', (done) => {
        const promise = CreateAutomationAction
          .execute({ automationId, userId });
        expect(promise).to.be.eventually.rejectedWith('InvalidAutomation')
          .notify(done);
      });
    });

    context('when the automation is valid', () => {
      const automationId = validAutomation.id;

      context('and the action is not valid', () => {
        const { userId } = validAutomation;
        const automationAction = { name: 'without type' };

        it('should reject the promise', (done) => {
          const promise = CreateAutomationAction
            .execute({ automationId, userId, automationAction });
          expect(promise).to.be.eventually.rejectedWith('MissingParams')
            .notify(done);
        });
      });

      context('and the action is valid', () => {
        beforeEach(() => {
          sinon.stub(AutomationAction, 'save').resolves({});
        });
        afterEach(() => AutomationAction.save.restore());

        const automationAction = {
          name: 'my automation',
          userId: 'fake-user',
          type: 'list.recipient.subscribe',
          status: 'whatever',
          campaign: { subject: 'The subject', body: 'The body' }
        };
        const { userId, listId, status, senderId } = validAutomation;
        const computedAutomationAction = Object.assign({}, automationAction, { userId, listId, status, senderId });

        it('should pick listId, senderId and status from automation', async () => {
          await CreateAutomationAction.execute({ automationId, userId, automationAction });
          expect(AutomationAction.save).to.have.been.calledOnce;
          expect(AutomationAction.save).to.have.been
            .calledWithMatch(sinon.match(computedAutomationAction));
        });

        it('should contain the event footprint', async () => {
          const footprint = FootprintCalculator.calculate(computedAutomationAction);
          await CreateAutomationAction.execute({ automationId, userId, automationAction });
          expect(AutomationAction.save).to.have.been.calledOnce;
          expect(AutomationAction.save).to.have.been
            .calledWithMatch(sinon.match({ footprint }));
        });

        context('and the type is campaign.not.opened', () => {
          it('generates the correct automation action with conditions', async () => {
            const notOpenedAction = Object.assign(
              {},
              automationAction,
              { type: 'campaign.not.opened', delay: 300 }
            );
            const expectedAutomationAction = {
              id: sinon.match.string,
              campaign: sinon.match(notOpenedAction.campaign),
              delay: 0,
              type: 'campaign.not.opened',
              triggerEventType: 'email.delivered',
              userId: validAutomation.userId,
              status: validAutomation.status,
              listId: validAutomation.listId,
              name: notOpenedAction.name,
              automationId: validAutomation.id,
              senderId: validAutomation.senderId,
              footprint: sinon.match.string,
              conditions: [
                {
                  type: 'aggregationCount',
                  resource: 'recipient.activity',
                  filters: [
                    { campaignId: { eq: sinon.match.string } },
                    { eventType: { eq: 'email.opened' } }
                  ],
                  count: 0,
                  delay: 300
                }
              ]
            };
            await CreateAutomationAction.execute({ automationId, userId, automationAction: notOpenedAction });
            expect(AutomationAction.save).to.have.been.calledWithMatch(expectedAutomationAction);
          });
        });
      });
    });
  });
});
