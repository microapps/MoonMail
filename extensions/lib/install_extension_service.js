import 'babel-polyfill';
import { User } from './models/user';
import Extensions from './extensions';
import CreateStripeSubscription from './create_stripe_subscription';

export default class InstallExtensionService {
  static execute({userId, extensionId}) {
    return (new InstallExtensionService({userId, extensionId})).execute();
  }

  constructor({userId, extensionId}) {
    this.userId = userId;
    this.extensionId = extensionId;
  }

  execute() {
    return User.get(this.userId)
      .then(user => this._checkNotInstalled(user, this.extensionId))
      .then(user => this._installExtension(user, this.extensionId))
      .then(user => user.installedExtensionIds);
  }

  _checkNotInstalled(user = {}, extensionId) {
    return new Promise((resolve, reject) => {
      const hasExtension = (user.installedExtensionIds || []).includes(extensionId);
      return hasExtension
        ? reject(new Error('ExtensionAlreadyInstalled'))
        : resolve(user);
    });
  }

  _installExtension(user, extensionId) {
    return this._getExtension(extensionId)
      .then(extension => this._chargeExtension(user, extension))
      .then(_ => this._updateInstalledExtensions(user, extensionId));
  }

  _updateInstalledExtensions(user, extensionId) {
    const installedExtensionIds = (user.installedExtensionIds || []).concat(extensionId);
    return User.update({installedExtensionIds}, user.id);
  }

  _chargeExtension(user, extension) {
    const isPaid = extension.price > 0;
    return isPaid
      ? this._doCharge(user, extension)
      : Promise.resolve(extension);
  }

  _doCharge(user, extension) {
    return extension.recurring
      ? this._subscribeToExtension(user, extension)
      : Promise.reject('NotImplemented'); // TODO: implement one payment extensions
  }

  _subscribeToExtension(user, extension) {
    const stripePlan = Extensions.getStripePlanId(extension.id);
    return CreateStripeSubscription.execute(user.id, stripePlan);
  }

  _getExtension(extensionId) {
    const extension = Extensions.get(extensionId);
    return extension
      ? Promise.resolve(extension)
      : Promise.reject(new Error('ExtensionDoesNotExist'));
  }
}
