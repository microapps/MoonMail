import IncrementReportCounters from './commandHandlers/IncrementReportCounters';

export default {
  processEmailNotifications: IncrementReportCounters.execute
};
