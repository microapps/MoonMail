import Promise from 'bluebird';
import { Click } from 'moonmail-models';
import SesNotification from './notifications/SesNotification';
import LinkClick from './notifications/LinkClick';
import EmailOpen from './notifications/EmailOpen';
import Event from './events/Event';
import InternalEventsClient from './lib/InternalEventsClient';
import EventsRouterClient from './lib/EventsRouterClient';

const processSesNotification = function processSesNotification(notification = {}) {
  if (!SesNotification.isValid(notification)) return Promise.resolve(true);
  const event = Event.fromSesNotification(notification);
  return EventsRouterClient.write({ topic: event.type, payload: event });
};

const processEmailEvent = function processEmailEvent(event = {}, validator, parser) {
  if (!validator(event)) return Promise.resolve(true);
  const moonmailEvent = parser(event);
  const notifications = [
    EventsRouterClient.write({ topic: moonmailEvent.type, payload: moonmailEvent }),
    InternalEventsClient.publish({ event: moonmailEvent })
  ];
  return Promise.all(notifications);
};

const processLinkClick = function processLinkClick(linkClick = {}) {
  return Api.processEmailEvent(linkClick, LinkClick.isValid, Event.fromLinkClick);
};

const processEmailOpen = function processEmailOpen(emailOpen = {}) {
  return Api.processEmailEvent(emailOpen, EmailOpen.isValid, Event.fromEmailOpen);
};

const persistLinkClick = function persistLinkClick(linkClick = {}) {
  if (!LinkClick.isValid(linkClick)) return Promise.resolve(true);
  return Click.save(linkClick);
};

const Api = {
  processSesNotification,
  processLinkClick,
  persistLinkClick,
  processEmailEvent,
  processEmailOpen
};

export default Api;
