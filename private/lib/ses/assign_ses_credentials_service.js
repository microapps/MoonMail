import { NotificationsBus } from '../notifications_bus';

class AssignSesCredentialsService {

  static assign(user) {
    return new AssignSesCredentialsService(user).assign();
  }

  constructor(user) {
    this.user = user;
  }

  assign() {
    const subject = `MoonMail: user ${this.user.id} has switched to ${this.user.plan} plan`;
    const message = `The user with Google id ${this.user.id} and email ${this.user.email} has switched to the ${this.user.plan} plan. Please, set/unset API Keys`;
    return NotificationsBus.publish('emailAdmins', message, subject)
      .then(() => this.user)
      .catch(() => this.user);
  }
}

module.exports.AssignSesCredentialsService = AssignSesCredentialsService;
