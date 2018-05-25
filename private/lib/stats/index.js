import { SendStatisticsService } from './send_statistics_service';

// TODO:
// This should probably rely on the "Campaigns micro-service" instead of 
// using Campaign's class directly
//

const Stats = {
  sendStats(userId) {
    return SendStatisticsService.statsFor(userId);
  }
};

export default Stats;
