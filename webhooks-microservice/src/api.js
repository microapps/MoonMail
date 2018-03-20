'use strict';

import { create, readAll, readOne, remove, update } from './webhooks/webhook-handler'
import { decryptToken, createToken } from './auth-token'
import Logger from './logger';
import { validateParams, paramsTypes, responses, httpErrors } from './api-utils'

const createWebhook = async (event, context, cb) => {
    try {
        Logger.configureLogger(event, context)
        Logger.logger().info('createWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        const data = JSON.parse(event.body)
        data.userID = user.id
        await validateParams(data, paramsTypes.CREATE)

        const createdWebhook = await create(data)

        cb(responses.success(createdWebhook))
    } catch (e) {
        Logger.logger().error(e)
        cb(responses.error(e))
    }
}

//todo: only admins of the whole system should be able to get this
const readAllWebhooks = async (event, context) => {
    Logger.configureLogger(event, context);
    Logger.logger().info('readAllWebhooks', JSON.stringify(event))

    return readAll(event)
        .then((r) => responses.success(r.Items))
        .catch((e) => {
            Logger.logger().error(e)
            return responses.error(e)
        })
}

const readOneWebhook = async (event, context, cb) => {
    try {
        Logger.configureLogger(event, context);
        Logger.logger().info('readOneWebhook', JSON.stringify(event))
        
        const user = await decryptToken(event.headers.Authorization)
        await validateParams(event.pathParameters, paramsTypes.READONE)
        
        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound
        if (webhook.Item.userID != user.id) throw httpErrors.unauthorized

        cb(responses.success(webhook.Item))
    } catch (e) {
        Logger.logger().error(e)
        cb(responses.error(e))
    }
}

const updateWebhook = async (event, context, cb) => {
    try {
        Logger.configureLogger(event, context);
        Logger.logger().info('updateWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        const data = JSON.parse(event.body)
        data.userID = user.id
        await validateParams(Object.assign(data, event.pathParameters), paramsTypes.UPDATE)

        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound
        if (webhook.Item.userID != user.id) throw httpErrors.unauthorized

        data.createdAt = webhook.Item.createdAt
        const updatedWebhook = await update(event.pathParameters.id, data)

        cb(responses.success(updatedWebhook.Item))
    } catch (e) {
        Logger.logger().error(e)
        cb(responses.error(e))
    }
}

const removeWebhook = async (event, context, cb) => {
    try {
        Logger.configureLogger(event, context);
        Logger.logger().info('removeWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        await validateParams(event.pathParameters, paramsTypes.REMOVE)

        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound
        if (webhook.Item.userID != user.id) throw httpErrors.unauthorized

        const deletedWebhook = await remove(event.pathParameters.id)

        cb(responses.success(webhook.Item.id))
    } catch (e) {
        Logger.logger().error(e)
        cb(responses.error(e))
    }
}

module.exports = {
    createWebhook,
    readAllWebhooks,
    readOneWebhook,
    updateWebhook,
    removeWebhook
}