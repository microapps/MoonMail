import { AssignSesCredentialsService } from "./assign_ses_credentials_service";

const SES = {
  assignCredentials(user, credentials = {}) {
    return AssignSesCredentialsService.assign(user);
  }
};

export default SES;
