

const api = require('./src/api')

module.exports.create = (event, context, callback) => {
  api.createWebhook(event, context, (err, r) => {
    if (err) context.succeed(err)
    callback(null, r)
  })
};

module.exports.readAll = (event, context, callback) => {
  api.readAllWebhooks(event, context, (err, r) => {
    if (err) context.succeed(err)
    callback(null, r)
  })
}

module.exports.readOne = (event, context, callback) => {
  api.readOneWebhook(event, context, (err, r) => {
    if (err) context.succeed(err)
    callback(null, r)
  })
};

module.exports.update = (event, context, callback) => {
  api.updateWebhook(event, context, (err, r) => {
    if (err) context.succeed(err)
    callback(null, r)
  })
};

module.exports.delete = (event, context, callback) => {
  api.removeWebhook(event, context, (err, r) => {
    if (err) context.succeed(err)
    callback(null, r)
  })
};
