import Promise from 'bluebird';
import { Click, Open } from 'moonmail-models';
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

const persistEmailEvent = function persistEmailEvent(emailEvent = {}) {
  const eventTypeRepositoryMapping = {
    'email.opened': { repository: Open, validator: EmailOpen.isValid },
    'email.link.clicked': { repository: Click, validator: LinkClick.isValid }
  };
  const { repository, validator } = eventTypeRepositoryMapping[emailEvent.type] || {};
  const { payload } = emailEvent;
  if (!validator || !validator(payload)) return Promise.resolve(true);
  return repository.save(payload);
};

const Api = {
  processSesNotification,
  processEmailEvent,
  processLinkClick,
  processEmailOpen,
  persistEmailEvent
};

export default Api;
