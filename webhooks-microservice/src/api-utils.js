import Joi from 'joi'

const subjectsWithID = ['list']
const subjects = ['list', 'email', 'campaign']
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
        subject: Joi.valid(subjects).required(),
        subjectID: Joi.string().min(1).max(50).when('subject', { is: subjectsWithID, then: Joi.required() }),
        event: Joi.valid(events).required(),
        webhook: Joi.string().min(3).max(100).required(),
        userID: Joi.string().min(1).max(50).required()
    }),
    [paramsTypes.UPDATE]: Joi.object({
        id: Joi.string().min(1).max(50).required(),
        subject: Joi.valid(subjects).required(),
        subjectID: Joi.string().min(1).max(50).when('subject', { is: subjectsWithID, then: Joi.required() }),
        event: Joi.valid(events).required(),
        webhook: Joi.string().min(3).max(100).required(),
        userID: Joi.string().min(1).max(50).required()
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
    success: (data = {}, code = 200) => {
        return {
            'statusCode': code,
            'headers': responseHeaders,
            'body': JSON.stringify({ items: data })
        }
    },
    error: (error) => {
        return {
            'statusCode': error.code || 500,
            'headers': responseHeaders,
            'body': JSON.stringify({ err: error })
        }
    }
}

const validateParams = (params, eventType) => {
    return new Promise((resolve, reject) => {
        Joi.validate(params, requestParams[eventType], { abortEarly: false }, (err, validate) => {
            if (err) reject(err.toString())
            else resolve(true)
        })
    })
}


module.exports = {
    validateParams,
    paramsTypes,
    responses,
    httpErrors
}