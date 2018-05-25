import 'babel-polyfill';
import { User } from './models/user';
import Extensions from './extensions';
import FetchStripeSubscription from './fetch_stripe_subscription';
import CancelStripeSubscription from './cancel_stripe_subscription';

export default class UninstallExtensionService {
  static execute({userId, extensionId}) {
    return (new UninstallExtensionService({userId, extensionId})).execute();
  }

  constructor({userId, extensionId}) {
    this.userId = userId;
    this.extensionId = extensionId;
  }

  execute() {
    return User.get(this.userId)
      .then(user => this._checkInstalled(user, this.extensionId))
      .then(user => this._uninstallExtension(user, this.extensionId))
      .then(user => user.installedExtensionIds);
  }

  _checkInstalled(user = {}, extensionId) {
    return new Promise((resolve, reject) => {
      const hasExtension = (user.installedExtensionIds || []).includes(extensionId);
      return hasExtension
        ? resolve(user)
        : reject(new Error('ExtensionNotInstalled'));
    });
  }

  _uninstallExtension(user, extensionId) {
    return this._getExtension(extensionId)
      .then(extension => this._cancelExtensionSubscription(user, extension))
      .then(_ => this._updateInstalledExtensions(user, extensionId));
  }

  _updateInstalledExtensions(user, extensionId) {
    const installedExtensionIds = (user.installedExtensionIds || [])
      .filter(eid => eid !== extensionId);
    return User.update({installedExtensionIds}, user.id);
  }

  _cancelExtensionSubscription(user, extension) {
    const isPaid = extension.price > 0;
    return isPaid && extension.recurring
      ? this._doCancel(user, extension)
      : Promise.resolve(extension);
  }

  _doCancel(user, extension) {
    return extension.recurring
      ? this._unsubscribeFromExtension(user, extension)
      : Promise.reject('NotImplemented'); // TODO: implement one payment extensions
  }

  _unsubscribeFromExtension(user, extension) {
    const stripePlan = Extensions.getStripePlanId(extension.id);
    return FetchStripeSubscription.execute(user, stripePlan)
      .then(subscription => CancelStripeSubscription.execute(subscription.id));
  }

  _getExtension(extensionId) {
    const extension = Extensions.get(extensionId);
    return extension
      ? Promise.resolve(extension)
      : Promise.reject(new Error('ExtensionDoesNotExist'));
  }
}
