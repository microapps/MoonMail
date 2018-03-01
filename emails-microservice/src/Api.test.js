import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Api from './Api';
import SesNotification from './notifications/SesNotification';
import Event from './events/Event';
import EventsRouterClient from './lib/EventsRouterClient';
import validNotification from './notifications/fixtures/delivery.json';

const { expect } = chai;
chai.use(sinonChai);

describe('Api', () => {
  describe('.processSesNotification', () => {
    context('when the notification is valid', () => {
      before(() => sinon.stub(EventsRouterClient, 'write').resolves(true));
      after(() => EventsRouterClient.write.restore());

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
      before(() => sinon.spy(EventsRouterClient, 'write'));
      after(() => EventsRouterClient.write.restore());

      it('does not publish an event to the router', async () => {
        await Api.processSesNotification({ invalid: 'notification' });
        expect(EventsRouterClient.write).to.not.have.been.called;
      });
    });
  });
});
