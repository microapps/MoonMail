import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Click, Open } from 'moonmail-models';
import Api from './Api';
import Event from './events/Event';
import LinkClick from './notifications/LinkClick';
import EmailOpen from './notifications/EmailOpen';
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

  describe('.processEmailOpen', () => {
    before(() => sinon.stub(Api, 'processEmailEvent').resolves(true));
    after(() => Api.processEmailEvent.restore());

    it('delegates on processEmailEvent with correct params', async () => {
      const event = { the: 'event' };
      await Api.processEmailOpen(event);
      expect(Api.processEmailEvent).to.have.been.calledWithExactly(
        event, EmailOpen.isValid, Event.fromEmailOpen);
    });
  });

  describe('.persistEmailEvent', () => {
    beforeEach(() => {
      sinon.stub(Click, 'save').resolves(true);
      sinon.stub(Open, 'save').resolves(true);
    });
    afterEach(() => {
      Click.save.restore();
      Open.save.restore();
    });

    context('when the event is valid', () => {
      const campaignId = 'campaign-id';
      const linkId = 'link-id';
      const listId = 'list-id';
      const recipientId = 'recipient-id';
      const userId = 'user-id';
      const segmentId = 'segment-id';
      const httpHeaders = { Host: 'localhost', 'User-Agent': 'Firefox' };
      const timestamp = 56789;
      const testSuite = [
        {
          emailEvent: {
            type: 'email.opened',
            payload: { campaignId, listId, linkId, recipientId, userId, segmentId, timestamp, metadata: httpHeaders }
          },
          expectedRepository: Open
        },
        {
          emailEvent: {
            type: 'email.link.clicked',
            payload: { campaignId, listId, linkId, recipientId, userId, segmentId, timestamp, metadata: httpHeaders }
          },
          expectedRepository: Click
        }
      ];

      it('persists the event', async () => {
        const promises = testSuite.map(({ emailEvent, expectedRepository }) => {
          return Api.persistEmailEvent(emailEvent)
            .then(expect(expectedRepository.save).to.have.been.calledWithExactly(emailEvent.payload));
        });
        await Promise.all(promises);
      });
    });

    context('when the event is not valid', () => {
      it('should not save the click', async () => {
        await Api.persistEmailEvent({ type: 'email.opened', payload: null });
        expect(Open.save).to.not.have.been.called;
      });
    });
  });
});
