import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Api from './Api';
import Event from './events/Event';
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

  describe('.processLinkClick', () => {
    beforeEach(() => {
      sinon.stub(EventsRouterClient, 'write').resolves(true);
      sinon.stub(InternalEventsClient, 'publish').resolves(true);
    });
    afterEach(() => {
      EventsRouterClient.write.restore();
      InternalEventsClient.publish.restore();
    });

    context('when the link click is valid', () => {
      const linkClick = {
        campaignId: 'campaign-id',
        listId: 'list-id',
        linkId: 'link-id',
        recipientId: 'recipient-id',
        userId: 'user-id',
        httpHeaders: { 'User-Agent': 'Firefox' }
      };
      const event = Event.fromLinkClick(linkClick);

      it('publishes an event to the events router', async () => {
        const expected = {
          topic: event.type,
          payload: event
        };
        await Api.processLinkClick(linkClick);
        expect(EventsRouterClient.write).to.have.been.calledWithExactly(expected);
      });

      it('publishes an event to the link clicks topic', async () => {
        await Api.processLinkClick(linkClick);
        expect(InternalEventsClient.publish).to.have.been.calledWithExactly({ event });
      });
    });

    context('when the link click is not valid', () => {
      it('does not publish an event to the events router', async () => {
        await Api.processLinkClick({ not: 'valid' });
        expect(EventsRouterClient.write).to.not.have.been.called;
      });

      it('does not publish an event to the internal events client', async () => {
        await Api.processLinkClick({ not: 'valid' });
        expect(InternalEventsClient.publish).to.not.have.been.called;
      });
    });
  });
});
