import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import { AutomationAction } from 'moonmail-models';
import AutomationsTriggerService from './automations_trigger_service';
import FootprintCalculator from '../../lib/footprint_calculator';
import AutomationActionDispatcherFactory from './AutomationActionDispatcherFactory';
import AutomationActionDispatcher from './AutomationActionDispatcher';

const { expect } = chai;
chai.use(sinonChai);

const campaignId = 'campaign-id';
const listId = 'list-id';
const userId = 'user-id';
const senderId = 'sender-id';
const eventGenerator = (type, payload, options = {}) => ({
  type, payload: Object.assign({}, payload, options) });
const recipientSubscribeEvtGen = (options) => {
  const payload = {
    recipient: {
      id: faker.random.alphaNumeric(5),
      email: faker.internet.email(),
      listId,
      userId,
      metadata: { name: faker.name.firstName() }
    }
  };
  return eventGenerator('list.recipient.subscribe', payload, options);
};
const emailDeliveredEvtGen = (options) => {
  const payload = {
    recipientId: faker.random.alphaNumeric(5),
    listId,
    userId,
    campaignId
  };
  return eventGenerator('email.delivered', payload, options);
};
const automationActionGenerator = (options = {}) => {
  const defaults = {
    id: campaignId,
    automationId: faker.random.alphaNumeric(5),
    userId,
    listId,
    senderId,
    campaignId,
    type: 'list.recipient.subscribe',
    delay: 3600,
    status: 'active',
    campaign: { subject: 'Email subject {{name}}', body: 'Email body {{name}}' },
    name: faker.commerce.productName()
  };
  const automation = Object.assign({}, defaults, options);
  automation.footprint = FootprintCalculator.calculate(automation, 'automation');
  return automation;
};
const subscribeAutomationAction = automationActionGenerator();
const notOpenedAutomation = automationActionGenerator({
  type: 'campaing.not.opened',
  triggerEventType: 'email.delivered',
  conditions: [{
    type: 'aggregationCount',
    resource: 'recipient.activity',
    filters: [
      { campaignId: { eq: 'not-opened-automation-id' } },
      { eventType: { eq: 'email.opened' } }
    ],
    count: 0,
    delay: 300
  }]
});

describe('AutomationsTriggerService', () => {
  describe('.execute()', () => {
    const notOpenedAutomationDispatcher = {};
    const subscribedAutomationDispatcher = {};
    const recipientSubscribedTriggeredEvents = Array(5).fill().map(() => recipientSubscribeEvtGen());
    const emailDeliveredEvents = Array(5).fill().map(() => emailDeliveredEvtGen());
    const notTriggeredEvents = [recipientSubscribeEvtGen({ recipient: { listId: 'foo' } }), emailDeliveredEvtGen({ campaignId: 'bar' })];
    const events = recipientSubscribedTriggeredEvents.concat(emailDeliveredEvents).concat(notTriggeredEvents);

    beforeEach(() => {
      sinon.stub(AutomationAction, 'allByStatusAndFootprint')
        .withArgs('active', notOpenedAutomation.footprint)
        .resolves({ items: [notOpenedAutomation] })
        .withArgs('active', subscribeAutomationAction.footprint)
        .resolves({ items: [subscribeAutomationAction] })
        .withArgs(sinon.match.any)
        .resolves({ items: [] });
      notOpenedAutomationDispatcher.dispatch = sinon.stub().resolves(true);
      subscribedAutomationDispatcher.dispatch = sinon.stub().resolves(true);
      sinon.stub(AutomationActionDispatcherFactory, 'build')
        .withArgs(notOpenedAutomation, sinon.match.array)
        .returns(notOpenedAutomationDispatcher)
        .withArgs(subscribeAutomationAction, sinon.match.array)
        .returns(subscribedAutomationDispatcher);
    });
    afterEach(() => {
      AutomationAction.allByStatusAndFootprint.restore();
      AutomationActionDispatcherFactory.build.restore();
    });

    it('creates a dispatcher for every triggered automation action', async () => {
      await AutomationsTriggerService.execute(events);
      const expectations = [
        [subscribeAutomationAction, recipientSubscribedTriggeredEvents],
        [notOpenedAutomation, emailDeliveredEvents]
      ];
      expect(AutomationActionDispatcherFactory.build).to.have.been.calledTwice;
      expectations.forEach(([automationAction, automationActionEvents]) =>
        expect(AutomationActionDispatcherFactory.build).to.have.been.calledWithExactly(automationAction, automationActionEvents));
    });

    it('dispatches all the triggered automation actions', async () => {
      await AutomationsTriggerService.execute(events);
      expect(notOpenedAutomationDispatcher.dispatch).to.have.been.calledOnce;
      expect(subscribedAutomationDispatcher.dispatch).to.have.been.calledOnce;
    });
  });
});
