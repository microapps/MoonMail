import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import faker from 'faker';
import moment from 'moment';
import { AutomationAction, ScheduledEmail } from 'moonmail-models';
import TriggerAutomationsService from './trigger_automations_service';
import FootprintCalculator from '../../lib/footprint_calculator';
import FunctionsClient from '../../lib/functions_client';

const expect = chai.expect;
chai.use(sinonChai);

const campaignId = 'campaign-id';
const listId = 'list-id';
const userId = 'user-id';
const senderId = 'sender-id';
const apiHost = 'api.moonmail.io';
const sender = {
  id: senderId,
  emailAddress: 'sender@email.com',
  fromName: 'From Name'
};
const fetchSenderFunctionName = 'function-name';
const eventGenerator = (type, payload, options = {}) => {
  return {type, payload: Object.assign({}, payload, options)};
};
const recipientSubscribeEvtGen = (options) => {
  const payload = {
    recipient: {
      id: faker.random.alphaNumeric(5),
      email: faker.internet.email(),
      listId,
      userId,
      metadata: {name: faker.name.firstName()}
    }
  };
  return eventGenerator('list.recipient.subscribe', payload, options);
};
const campaignOpenEvtGen = (options) => {
  const payload = {
    recipient: {id: faker.random.alphaNumeric(5), listId, userId},
    campaign: {id: campaignId, userId}
  };
  return eventGenerator('campaign.open', payload, options);
};
const automationActionGenerator = (options = {}) => {
  const defaults = {
    id: campaignId,
    automationId: faker.random.alphaNumeric(5),
    userId,
    listId,
    senderId,
    type: 'list.recipient.subscribe',
    delay: 3600,
    status: 'active',
    campaign: {subject: 'Email subject {{name}}', body: 'Email body {{name}}'},
    name: faker.commerce.productName()
  };
  const automation = Object.assign({}, defaults, options);
  automation.footprint = FootprintCalculator.calculate(automation, 'automation');
  return automation;
};

describe('TriggerAutomationsService', () => {
  describe('.execute()', () => {
    const subscribeAutomationAction = automationActionGenerator();
    const openAutomation = automationActionGenerator({type: 'campaign.open'});
    let automationStub;

    beforeEach(() => {
      automationStub = sinon.stub(AutomationAction, 'allByStatusAndFootprint')
        .withArgs('active', subscribeAutomationAction.footprint)
        .resolves({items: [subscribeAutomationAction]})
        .withArgs('active', openAutomation.footprint)
        .resolves({items: [openAutomation]});
      sinon.stub(ScheduledEmail, 'saveAll').resolves(true);
      sinon.stub(FunctionsClient, 'execute')
        .withArgs(fetchSenderFunctionName, {userId, senderId})
        .resolves(sender);
      process.env.API_HOST = apiHost;
      process.env.FETCH_SENDER_FN_NAME = fetchSenderFunctionName;
    });
    afterEach(() => {
      AutomationAction.allByStatusAndFootprint.restore();
      ScheduledEmail.saveAll.restore();
      FunctionsClient.execute.restore();
      delete process.env.API_HOST;
      delete process.env.FETCH_SENDER_FN_NAME;
    });

    context('when an automation is triggered', () => {
      const event = recipientSubscribeEvtGen();

      it('should schedule an email', async () => {
        await TriggerAutomationsService.execute([event]);
        const expectedRecipient = Object.assign(
          {},
          event.payload.recipient,
          {unsubscribeUrl: sinon.match.string}
        );
        const expectedEmail = {
          id: sinon.match.string,
          scheduledAt: moment().unix() + subscribeAutomationAction.delay,
          userId,
          campaign: sinon.match({ body: sinon.match.string, id: sinon.match.string, subject: sinon.match.string }),
          sender,
          recipient: expectedRecipient,
          status: 'scheduled',
          automationActionId: subscribeAutomationAction.id,
          automationId: subscribeAutomationAction.automationId
        };
        expect(ScheduledEmail.saveAll).to.have.been.calledWithMatch([expectedEmail]);
        const actualCampaign = ScheduledEmail.saveAll.lastCall.args[0][0].campaign;
        expect(actualCampaign.body).to.contain(`Email body ${event.payload.recipient.metadata.name}`);
        expect(actualCampaign.body).to.contain(`https://${apiHost}/links/open`);
        expect(actualCampaign.subject).to.contain(`Email subject ${event.payload.recipient.metadata.name}`);
      });
    });

    context('when more than 25 automations are triggered', () => {
      const events = Array(30).fill().map(() => recipientSubscribeEvtGen());

      it('should schedule them in batches of 25', async () => {
        await TriggerAutomationsService.execute(events);
        expect(ScheduledEmail.saveAll).to.have.been.calledTwice;
        const firstCallArgs = ScheduledEmail.saveAll.firstCall.args[0];
        const secondCallArgs = ScheduledEmail.saveAll.lastCall.args[0];
        expect(firstCallArgs.length).to.equal(25);
        expect(secondCallArgs.length).to.equal(5);
      });
    });

    context('when there is an error fetching one automation', () => {
      const subscribeEvents = Array(15).fill().map(() => recipientSubscribeEvtGen());
      const openEvents = Array(5).fill().map(() => campaignOpenEvtGen());
      const events = subscribeEvents.concat(openEvents);

      beforeEach(() => {
        automationStub.onFirstCall().rejects(new Error('unexpected error'));
      });

      it('should schedule the rest of them', async () => {
        await TriggerAutomationsService.execute(events);
        expect(ScheduledEmail.saveAll).to.have.been.calledOnce;
      });
    });
  });
});
