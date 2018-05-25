import { configureLogger, logger } from './lib/logger';
import Screenshots from './lib/screenshots';

export function takeScreenshot(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Screenshots.takeScreenshot(event.url)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}

export function takeScreenshotFromHtml(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Screenshots.takeScreenshotFromHtml(event.html)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}
