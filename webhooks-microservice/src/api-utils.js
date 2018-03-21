import Joi from 'joi'

const itemsWithID = ['list']
const items = ['list', 'email', 'campaign']
const events = ['create', 'update', 'delete', 'subscribe', 'unsubscribe']

const paramsTypes = {
    CREATE: 'create-webhook',
    UPDATE: 'update-webhook',
    REMOVE: 'remove-webhook',
    READONE: 'read-one-webhook',
    READALL: 'read-all-webhook'
}

const httpErrors = {
    unauthorized: {
        error: 'Unauthorized',
        code: 403
    },
    notFound: {
        error: 'Not found',
        code: 404
    },
    tokenNotProvided: {
        error: 'Token not provided',
        code: 403
    }
}

const requestParams = {
    [paramsTypes.CREATE]: Joi.object({
        item: Joi.valid(items).required(),
        itemId: Joi.string().min(1).max(50).when('item', { is: itemsWithID, then: Joi.required() }),
        event: Joi.valid(events).required(),
        url: Joi.string().min(3).max(100).required(),
        userId: Joi.string().min(1).max(50).required()
    }),
    [paramsTypes.UPDATE]: Joi.object({
        id: Joi.string().min(1).max(50).required(),
        item: Joi.valid(items),
        itemId: Joi.string().min(1).max(50).when('item', { is: itemsWithID, then: Joi.required() }),
        event: Joi.valid(events),
        url: Joi.string().min(3).max(100),
        wb: Joi.string().min(1).max(50)
    }),
    [paramsTypes.REMOVE]: Joi.object({
        id: Joi.string().min(1).max(50).required()
    }),
    [paramsTypes.READONE]: Joi.object({
        id: Joi.string().min(1).max(50).required()
    })
}

const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true
}

const responses = {
    success: (data = {}, code = 200) => ({
            'statusCode': code,
            'headers': responseHeaders,
            'body': JSON.stringify({ items: data })
        }),
    error: (error) => ({
            'statusCode': error.code || 500,
            'headers': responseHeaders,
            'body': JSON.stringify({ err: error })
        })
}

const validateParams = (params, eventType) => new Promise((resolve, reject) => {
        Joi.validate(params, requestParams[eventType], { abortEarly: false }, (err) => {
            if (err) reject(err.toString())
            else resolve(true)
        })
    })


module.exports = {
    validateParams,
    paramsTypes,
    responses,
    httpErrors
}