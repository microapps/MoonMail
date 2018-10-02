import { Report } from 'moonmail-models';

function incrementCounters(campaignId, counters) {
  return Report.incrementAll(campaignId, null, counters);
}

export default {
  incrementCounters
};
