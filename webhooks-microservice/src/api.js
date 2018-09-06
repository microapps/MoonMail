'use strict';

import { create, queryAllUserId, readOne, remove, update } from './webhooks/webhook-handler'
import { decryptToken } from './auth-token'
import { validateParams, paramsTypes, responses, httpErrors, log, validateItem } from './api-utils'

const createWebhook = async (event, context, cb) => {
    try {
        log('api.createWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        const data = JSON.parse(event.body)
        data.userId = user.sub

        await validateItem(data.userId, data.item, data.itemId)
        await validateParams(data, paramsTypes.CREATE)

        const createdWebhook = await create(data)

        cb(responses.success(createdWebhook))
    } catch (e) {
        log('api.createWebhook.error', e)
        cb(responses.error(e))
    }
}

const readAllWebhooks = async (event, context, cb) => {
    try {
        log('api.readAllWebhooks', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        const params = user.sub

        const webhooks = await queryAllUserId(params)

        cb(responses.success({ items: webhooks.Items }))
    } catch (e) {
        log('api.readAllWebhooks.error', e)
        cb(responses.error(e))
    }
}

const readOneWebhook = async (event, context, cb) => {
    try {
        log('api.readOneWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        await validateParams(event.pathParameters, paramsTypes.READONE)

        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound
        if (webhook.Item.userId !== user.sub) throw httpErrors.unauthorized

        cb(responses.success(webhook.Item))
    } catch (e) {
        log('api.readOneWebhook.error', e)
        cb(responses.error(e))
    }
}

const updateWebhook = async (event, context, cb) => {
    try {
        log('api.updateWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        let data = JSON.parse(event.body)

        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound

        await validateItem(user.sub, webhook.Item.item, webhook.Item.itemId)
        await validateParams(Object.assign(data, event.pathParameters), paramsTypes.UPDATE)

        data = Object.assign(webhook.Item, data)
        const updatedWebhook = await update(event.pathParameters.id, data)

        cb(responses.success(updatedWebhook.Item))
    } catch (e) {
        log('api.updateWebhook.error', e)
        cb(responses.error(e))
    }
}

const removeWebhook = async (event, context, cb) => {
    try {
        log('api.removeWebhook', JSON.stringify(event))

        const user = await decryptToken(event.headers.Authorization)
        await validateParams(event.pathParameters, paramsTypes.REMOVE)

        const webhook = await readOne(event.pathParameters.id)
        if (!webhook || !webhook.Item) throw httpErrors.notFound
        if (webhook.Item.userId !== user.sub) throw httpErrors.unauthorized

        await remove(event.pathParameters.id)

        cb(responses.success(webhook.Item.id))
    } catch (e) {
        log('api.removeWebhook.error', e)
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