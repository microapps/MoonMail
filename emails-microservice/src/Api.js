import SesNotification from './notifications/SesNotification';
import LinkClick from './notifications/LinkClick';
import Event from './events/Event';
import EventsRouterClient from './lib/EventsRouterClient';

const processSesNotification = function processSesNotification(notification = {}) {
  if (!SesNotification.isValid(notification)) return Promise.resolve(true);
  const event = Event.fromSesNotification(notification);
  return EventsRouterClient.write({ topic: event.type, payload: event });
};

const processLinkClick = function processLinkClick(linkClick = {}) {
  if (!LinkClick.isValid(linkClick)) return Promise.resolve(true);
  const event = Event.fromLinkClick(linkClick);
  return EventsRouterClient.write({ topic: event.type, payload: event });
};

export default {
  processSesNotification,
  processLinkClick
};
