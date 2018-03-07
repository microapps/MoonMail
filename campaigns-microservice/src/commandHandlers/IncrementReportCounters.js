import R from 'ramda';

const supportedEventTypes = ['email.delivered', 'email.reported', 'email.bounced'];
const eventTypeSupported = R.pipe(
  R.prop('type'),
  R.partialRight(R.contains, [supportedEventTypes])
);
const eventIsValid = R.pipe(
  R.prop('payload'),
  R.has('campaignId')
);
const eventsByCampaign = R.groupBy(R.path(['payload', 'campaignId']));
const execute = function incrementReportCounters(events = []) {
  const eventsToCount = R.pipe(
    R.filter(eventTypeSupported),
    R.filter(eventIsValid),
    eventsByCampaign
  )(events);
  console.log(eventsToCount);
  return Promise.resolve(true);
};

export default {
  execute
};
