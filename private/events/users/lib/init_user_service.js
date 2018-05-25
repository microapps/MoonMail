import cuid from 'cuid';
import base64url from 'base64-url';
import { List, Recipient, Campaign, Automation, AutomationAction } from 'moonmail-models';
import faker from 'faker';
import { User } from '../../../lib/models/user';
import Auth0Client from '../../../lib/auth0-client';
import FootprintCalculator from './footprint_calculator';

export default class InitUserService {
  static execute(userId, campaignBody, automationBody) {
    return this._initUserDetails(userId)
      .then(userDetails => this._createSampleListAndRecipients(userDetails))
      .then(listDetails => this._createSampleCampaign(listDetails, campaignBody))
      .then(listDetails => this._createSampleAutomation(listDetails))
      .then(automationDetails => this._createSampleAutomationAction(automationDetails, automationBody));
  }

  static async _initUserDetails(userId) {
    const auth0user = await Auth0Client
      .query('getUser', {id: userId, fields: ['user_id', 'email', 'name', 'user_metadata']}, this.auth0Credentials);
    if ((auth0user.user_metadata || {}).isSesUser) {
      await User.update({email: auth0user.email, name: auth0user.name, plan: 'free_ses'}, userId);
    } else {
      await User.update({email: auth0user.email, name: auth0user.name}, userId);
    }
    return {userId, email: auth0user.email, name: auth0user.name};
  }

  static async _createSampleListAndRecipients({userId, email, name}) {
    const list = {
      userId,
      id: cuid(),
      name: 'Sample List',
      isDeleted: false.toString(),
      importStatus: {}
    };
    await List.save(list);
    const recipients = this._buildRecipients(email, list.id, userId);
    const recipientsPromises = recipients.map(recipient => Recipient.save(recipient));
    await Promise.all(recipientsPromises);
    return {listId: list.id, userId};
  }

  static _buildRecipients(email, listId, userId) {
    const genAliasEmail = (email, i) => email.replace(/@/g, `+${i}@`);
    const emails = [1, 2].map(i => genAliasEmail(email, i)).concat(email);
    const recipients = emails.map(email => ({
      userId,
      listId,
      email,
      metadata: {name: faker.name.firstName(), surname: faker.name.lastName()},
      id: base64url.encode(email),
      status: Recipient.statuses.subscribed
    }));
    return recipients;
  }

  static async _createSampleCampaign({listId, userId}, campaignBody) {
    const campaign = {
      userId,
      id: cuid(),
      status: 'draft',
      body: campaignBody,
      listIds: [listId],
      subject: 'My first MoonMail Campaign - Ecommerce Template',
      name: 'My first MoonMail Campaign - Ecommerce Template'
    };
    await Campaign.save(campaign);
    return {listId, userId};
  }

  static async _createSampleAutomation({listId, userId}) {
    const params = {
      userId,
      id: cuid(),
      listId,
      name: 'My first MoonMail Automation',
      status: 'paused'
    };
    const automation = await Automation.save(params);
    return {listId, userId, automationId: params.id};
  }

  static async _createSampleAutomationAction({listId, userId, automationId}, htmlBody) {
    const params = {
      id: cuid(),
      automationId,
      delay: 86400,
      listId,
      name: 'A day after the recipient subscribes to a list',
      status: 'paused',
      campaign: {
        subject: 'This email will be sent out one day after anybody subscribes to the list',
        body: htmlBody
      },
      type: 'list.recipient.subscribe',
      userId
    };
    params.footprint = FootprintCalculator.calculate(params);
    const automationAction = await AutomationAction.save(params);
    return {listId, userId, automationId: params.id};
  }

  static get auth0Credentials() {
    return {
      clientId: process.env.AUTH0_GLOBAL_CLIENT_ID,
      clientSecret: process.env.AUTH0_GLOBAL_CLIENT_SECRET,
      baseUrl: process.env.AUTH0_DOMAIN
    };
  }
}
