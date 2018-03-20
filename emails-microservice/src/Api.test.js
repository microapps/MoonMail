import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Click } from 'moonmail-models';
import Api from './Api';
import Event from './events/Event';
import LinkClick from './notifications/LinkClick';
import InternalEventsClient from './lib/InternalEventsClient';
import EventsRouterClient from './lib/EventsRouterClient';
import validNotification from './notifications/fixtures/delivery.json';

const { expect } = chai;
chai.use(sinonChai);

describe('Api', () => {
  describe('.processSesNotification', () => {
    beforeEach(() => sinon.stub(EventsRouterClient, 'write').resolves(true));
    afterEach(() => EventsRouterClient.write.restore());

    context('when the notification is valid', () => {
      it('publishes an event to the router', async () => {
        const event = Event.fromSesNotification(validNotification);
        const expected = {
          topic: event.type,
          payload: event
        };
        await Api.processSesNotification(validNotification);
        expect(EventsRouterClient.write).to.have.been.calledWithExactly(expected);
      });
    });

    context('when the notification is not valid', () => {
      it('does not publish an event to the router', async () => {
        await Api.processSesNotification({ invalid: 'notification' });
        expect(EventsRouterClient.write).to.not.have.been.called;
      });
    });
  });

  describe('.processEmailEvent', () => {
    beforeEach(() => {
      sinon.stub(EventsRouterClient, 'write').resolves(true);
      sinon.stub(InternalEventsClient, 'publish').resolves(true);
    });
    afterEach(() => {
      EventsRouterClient.write.restore();
      InternalEventsClient.publish.restore();
    });

    context('when the event is valid', () => {
      const emailEvent = { campaignId: 'campaign-id', listId: 'list-id' };
      const moonmailEvent = { type: 'my.type', payload: emailEvent };
      const validator = sinon.stub().withArgs(emailEvent).returns(true);
      const parser = sinon.stub().withArgs(emailEvent).returns(moonmailEvent);

      it('publishes an event to the events router', async () => {
        const expected = { topic: moonmailEvent.type, payload: moonmailEvent };
        await Api.processEmailEvent(emailEvent, validator, parser);
        expect(EventsRouterClient.write).to.have.been.calledWithExactly(expected);
      });

      it('publishes an internal event', async () => {
        await Api.processEmailEvent(emailEvent, validator, parser);
        expect(InternalEventsClient.publish).to.have.been.calledWithExactly({ event: moonmailEvent });
      });
    });

    context('when the link click is not valid', () => {
      const invalidEvent = { not: 'valid' };
      const validator = sinon.stub().withArgs(invalidEvent).returns(false);

      it('does not publish an event to the events router', async () => {
        await Api.processEmailEvent(invalidEvent, validator, null);
        expect(EventsRouterClient.write).to.not.have.been.called;
      });

      it('does not publish an event to the internal events client', async () => {
        await Api.processEmailEvent(invalidEvent, validator, null);
        expect(InternalEventsClient.publish).to.not.have.been.called;
      });
    });
  });

  describe('.processLinkClick', () => {
    before(() => sinon.stub(Api, 'processEmailEvent').resolves(true));
    after(() => Api.processEmailEvent.restore());

    it('delegates on processEmailEvent with correct params', async () => {
      const event = { the: 'event' };
      await Api.processLinkClick(event);
      expect(Api.processEmailEvent).to.have.been.calledWithExactly(
        event, LinkClick.isValid, Event.fromLinkClick);
    });
  });

  describe('.persistLinkClick', () => {
    beforeEach(() => sinon.stub(Click, 'save').resolves(true));
    afterEach(() => Click.save.restore());

    context('when the link click is valid', () => {
      const click = { recipientId: 'rid', listId: 'lid', campaignId: 'cid', linkId: 'lkid', userId: 'uid' };

      it('should save the link click in the database', async () => {
        await Api.persistLinkClick(click);
        expect(Click.save).to.have.been.calledWithExactly(click);
      });
    });

    context('when the link click is not valid', () => {
      it('should not save the click', async () => {
        await Api.persistLinkClick({ not: 'valid' });
        expect(Click.save).not.to.have.been.called;
      });
    });
  });
});
