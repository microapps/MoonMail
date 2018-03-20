'use strict';

const api = require('./src/api')

module.exports.create = (event, context, callback) => {
  api.createWebhook(event, context, (err, r) => {
    if(err) context.succeed(err)
    context.succeed(r)
  })
};

module.exports.readAll = (event, context, callback) => {
  api.readAllWebhooks(event, context)
    .then(r => context.succeed(r))
    .catch(e => context.succeed(e))
}

module.exports.readOne = (event, context, callback) => {
  api.readOneWebhook(event, context, (err, r) => {
    if(err) context.succeed(err)
    context.succeed(r)
  })
};

module.exports.update = (event, context, callback) => {
  api.updateWebhook(event, context, (err, r) => {
    if(err) context.succeed(err)
    context.succeed(r)
  })
};

module.exports.delete = (event, context, callback) => {
  api.removeWebhook(event, context, (err, r) => {
    if(err) context.succeed(err)
    context.succeed(r)
  })
};
