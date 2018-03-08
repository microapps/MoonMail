import R from 'ramda';
import Promise from 'bluebird';
import ReportRepository from '../repositories/Report';

const supportedEventTypes = ['email.delivered', 'email.reported', 'email.bounced'];
const eventTypeSupported = R.pipe(
  R.prop('type'),
  R.partialRight(R.contains, [supportedEventTypes])
);
const eventHasCampaignId = R.pipe(
  R.prop('payload'),
  R.has('campaignId')
);
const isValidEvent = R.allPass([eventTypeSupported, eventHasCampaignId]);
const isBounce = R.where({
  type: R.equals('email.bounced'),
  payload: R.complement(R.propEq('bounceType', 'Transient'))
});
const isSoftBounce = R.where({
  type: R.equals('email.bounced'),
  payload: R.propEq('bounceType', 'Transient')
});
const isComplaint = R.propEq('type', 'email.reported');
const isDelivery = R.propEq('type', 'email.delivered');
const eventToCounter = R.cond([
  [isBounce, R.always('bouncesCount')],
  [isSoftBounce, R.always('softBouncesCount')],
  [isDelivery, R.always('sentCount')],
  [isComplaint, R.always('complaintsCount')]
]);
const eventsByCampaign = R.groupBy(R.path(['payload', 'campaignId']));
const execute = function incrementReportCounters(events = []) {
  const campaignIdCountersPairs = R.pipe(
    R.filter(isValidEvent),
    eventsByCampaign,
    R.map(R.countBy(eventToCounter)),
    R.toPairs
  )(events);
  return Promise.map(campaignIdCountersPairs, ([campaignId, counters]) => {
    return ReportRepository.incrementCounters(campaignId, counters)
      .catch(err => console.error(err));
  });
};

export default {
  execute
};
