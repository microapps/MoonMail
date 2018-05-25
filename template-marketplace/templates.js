import omitEmpty from 'omit-empty';
import { configureLogger, logger } from './lib/logger';
import Templates from './lib/templates/index';

export function createTemplate(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.createTemplate(omitEmpty(event.template))
    .then(result => callback(null, result))
    .catch((err) => {
      callback(err);
    });
}

export function updateTemplate(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.updateTemplate(omitEmpty(event.template), event.templateId)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}

export function archiveTemplate(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.archiveTemplate(event.templateId)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(JSON.stringify(err));
    });
}

export function getTemplate(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.getTemplate(event.templateId)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}


export function listTemplates(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.listTemplates(omitEmpty(event.options), omitEmpty(event.pagination))
    .then((results) => {
      const templates = results.items.map((template) => {
        return {
          id: template.id,
          name: template.name,
          userId: template.userId,
          description: template.description,
          price: template.price,
          categories: template.categories,
          thumbnail: template.thumbnail,
          images: template.images,
          tags: template.tags,
          archived: template.archived,
          approved: template.approved,
          designer: template.designer
        };
      });
      return { items: templates, total: results.total };
    })
    .then(results => callback(null, results))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}

export function syncTemplatesWithES(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.syncTemplatesStreamWithES(event.Records)
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}

export function getAllTags(event, context, callback) {
  configureLogger(event, context);
  logger().info(JSON.stringify(event));
  return Templates.getAllTags()
    .then(result => callback(null, result))
    .catch((err) => {
      logger().error(err);
      callback(err);
    });
}
