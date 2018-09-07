import { DynamoDB } from 'aws-sdk'
import Joi from 'joi'

const itemsWithID = ['list']
const items = ['list', 'email', 'campaign']
const events = ['created', 'updated', 'deleted', 'subscribed', 'unsubscribed']

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
    },
    invalidList: {
        error: 'List not found',
        code: 404
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
        'body': JSON.stringify(data)
    }),
    error: (error) => ({
        'statusCode': error.code || 500,
        'headers': responseHeaders,
        'body': JSON.stringify({ message: error })
    })
}

const validateParams = (params, eventType) => new Promise((resolve, reject) => {
    Joi.validate(params, requestParams[eventType], { abortEarly: false }, (err) => {
        if (err) reject(err.toString())
        else resolve(true)
    })
})

// TODO: validate any kind of item
const validateItem = async (userId, item, itemId) => {
    const list = await queryAll({ userId: userId, id: itemId }, process.env.LISTSTABLE)
    if (list && list.Item && list.Item.id == itemId) return true

    const user = await queryAll({ id: userId }, process.env.USERSTABLE)
    if (!user || !user.Item || !user.Item.impersonations) throw httpErrors.invalidList

    const impersonationsList = await queryLists(user.Item.impersonations, itemId)
    const items = impersonationsList.Responses

    if (impersonationsList && items && items[process.env.LISTSTABLE] && items[process.env.LISTSTABLE].length > 0) return true
    else throw httpErrors.invalidList
}

const queryAll = async (keys, table) => {
    try {
        const params = {
            TableName: table,
            Key: keys
        };

        const dynamoDb = new DynamoDB.DocumentClient();

        return await dynamoDb.get(params).promise()
    } catch (e) {
        throw e.toString()
    }
}

const getKeys = (keys) => {
    return Object.keys(keys).forEach(key => keys[key] === undefined && delete keys[key])
}

const queryLists = async (impersonations, listId) => {
    try {
        const params = {
            RequestItems: {
                [process.env.LISTSTABLE]: {
                    Keys: getQueryKeys(impersonations, listId)
                }
            }
        };

        console.log(params.RequestItems['MoonMail-v2-dev-lists'])

        const dynamoDb = new DynamoDB.DocumentClient();

        return await dynamoDb.batchGet(params).promise()
    } catch (e) {
        throw e.toString()
    }
}

const getQueryKeys = (impersonations, sortKey) => {
    const ids = impersonations.map(v => v.userId)
    const keys = []
    ids.forEach(v => keys.push({ userId: v, id: sortKey }))
    return keys
}

const log = function () {
    if (process.env.DEBUG)
        console.log.apply(console, arguments);
}

module.exports = {
    validateParams,
    validateItem,
    paramsTypes,
    responses,
    httpErrors,
    log
}