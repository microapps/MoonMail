import { ReputationManagementService } from './reputation_management_service';

const ReputationControls = {

  perform(userId) {
    return ReputationManagementService.validate(userId);
  },

  performAndUpdate(userId) {
    return ReputationManagementService.buildAndUpdate(userId);
  },

  emailCostsPerReputation(reputation, sentEmails = 0) {
    // if (reputation <= 35) return 149;
    // if (reputation > 35 && reputation <= 50) return 129;
    // if (reputation > 50 && reputation <= 65) return 99;
    // if (reputation > 65 && reputation <= 80) return 79;
    // if (reputation > 80 && reputation <= 95) return 50;
    // if (reputation > 95) return 20;

    if (reputation <= 35 || sentEmails <= 50000) return 199;
    if (reputation > 35 && reputation <= 50) return 179;
    if (reputation > 50 && reputation <= 80) return 129;
    if (reputation > 80 && reputation <= 95) return 70;
    if (reputation > 95) return 49;
  }
};

export default ReputationControls;
