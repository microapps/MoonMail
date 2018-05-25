import R from 'ramda';
import Promise from 'bluebird';
import SubscriptionRepo from '../repositories/Subscription';
import KinesisNotifier from '../notifiers/KinesisNotifier';
import FirehoseNotifier from '../notifiers/FirehoseNotifier';
import Event from '../domain/Event';
import EventsDeadLetterQueue from '../lib/EventsDeadLetterQueue';

const subscriptionTypeAndPublisherMapping = {
  kinesis: KinesisNotifier,
  firehose: FirehoseNotifier
};

const byType = R.groupBy(R.prop('type'));
const streamEventsByType = R.pipe(
  R.map(Event.deserializeKinesisEvent),
  R.filter(Event.isValid),
  byType
);
const buildEventsSubscriptionPairs = function buildEventsSubscriptionPairs(subscriptions, kinesisRecords = []) {
  const eventsByType = streamEventsByType(kinesisRecords);
  return subscriptions.reduce((total, s) => {
    const events = eventsByType[s.type];
    return events ? total.concat([[events, s]]) : total;
  }, []);
};
const publishEventsSubscriptionPairs = function publishEventsSubscriptionPairs(eventSubscriptionPairs) {
  return Promise.map(eventSubscriptionPairs, (pair) => {
    const [event, { subscriberType }] = pair;
    return subscriptionTypeAndPublisherMapping[subscriberType].publishBatch(...pair);
  });
};
const handleUnexpectedError = function handleUnexpectedError(error, kinesisStream) {
  const message = { stream: kinesisStream, error: error.message };
  return EventsDeadLetterQueue.put(message);
};
const execute = function routeKinesisEvents(kinesisStream) {
  return SubscriptionRepo.getAll()
    .then(subscriptions => buildEventsSubscriptionPairs(subscriptions, kinesisStream.Records))
    .then(eventSubscriptionPairs => publishEventsSubscriptionPairs(eventSubscriptionPairs))
    .then(results => R.chain(R.prop('records'), results))
    .then(chainedResults => R.filter(R.has('error'), chainedResults))
    .then(erroredResults => Promise.map(erroredResults, evt => EventsDeadLetterQueue.put(evt)))
    .catch(error => handleUnexpectedError(error, kinesisStream));
};

export default {
  execute
};
