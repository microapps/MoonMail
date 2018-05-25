import { configureLogger, logger } from './lib/logger';
import InstallExtensionService from './lib/install_extension_service';
import UninstallExtensionService from './lib/uninstall_extension_service';

function installExtension(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return InstallExtensionService.execute(event)
    .then(result => callback(null, result))
    .catch(err => callback(err));
}

function uninstallExtension(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return UninstallExtensionService.execute(event)
    .then(result => callback(null, result))
    .catch(err => callback(err));
}

export {
  installExtension,
  uninstallExtension
};
