import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Api from './Api';
import Event from './events/Event';
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
    beforeEach(() => sinon.stub(EventsRouterClient, 'write').resolves(true));
    afterEach(() => EventsRouterClient.write.restore());

    context('when the link click is valid', () => {
      const linkClick = {
        campaignId: 'campaign-id',
        listId: 'list-id',
        linkId: 'link-id',
        recipientId: 'recipient-id',
        userId: 'user-id',
        httpHeaders: { 'User-Agent': 'Firefox' }
      };

      it('publishes an event to the events router', async () => {
        const event = Event.fromLinkClick(linkClick);
        const expected = {
          topic: event.type,
          payload: event
        };
        await Api.processLinkClick(linkClick);
        expect(EventsRouterClient.write).to.have.been.calledWithExactly(expected);
      });
    });

    context('when the link click is not valid', () => {
      it('does not publis an event to the events router', async () => {
        await Api.processLinkClick({ not: 'valid' });
        expect(EventsRouterClient.write).to.not.have.been.called;
      });
    });
  });
});
