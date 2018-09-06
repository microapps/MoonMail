'use strict'

import request from 'requestretry'
import { create, remove, update } from './failed-webhooks/webhook-handler'

module.exports.triggerWebbhook = (event, context, callback) => {
    const requestBody = getRequestBody(event.webhook)
    const params = getRequestParams(event.webhook.url, requestBody, event.attempts)

    request(params, (err, response, body) => {
        handleResponseCode(response.statusCode, event)
            .then(r => callback(null))
            .catch(e => callback(e))
    })
}

function customRetryStrategy(err, response, body) {
    return err || response.statusCode < 200 || response.statusCode > 299
}

const getRequestParams = (url, body, attempts = process.env.REQUESTATTEMPTS, delay = process.env.REQUESTRETRYDELAY) => ({
        url,
        method: 'POST',
        body,
        json: true,
        maxAttempts: attempts,
        retryDelay: delay,
        retryStrategy: customRetryStrategy
    })

const getRequestBody = (webhook) => ({
        item: webhook.item,
        itemId: webhook.itemId,
        event: webhook.event,
        userId: webhook.userId,
        recipient: webhook.recipient
    })

const failedRequestParams = (webhook, totalAttempts = 0, timer = process.env.REQUESTTIMER) => ({
        timer: timer * process.env.REQUESTTIMERMULTIPLIER,
        webhook: JSON.stringify(webhook),
        totalAttempts: parseInt(totalAttempts) + 1
    })

const handleResponseCode = async (responseCode, event) => {
    if (isHandlerError(responseCode, event)) {
        const dbData = failedRequestParams(event.webhook)
        return create(dbData)
    }
    else if (isSnifferError(responseCode, event)) {
        const dbData = failedRequestParams(event.webhook, event.failedRequest.totalAttempts, event.failedRequest.timer)
        dbData.createdAt = event.failedRequest.createdAt
        return update(event.failedRequest.id, dbData)
    }
    else if (isSnifferSuccess(responseCode, event)) {
        return remove(event.failedRequest.id)
    }
    else {
        return true
    }
}

function isHandlerError(responseCode, { source }) {
    return parseInt(responseCode) < 200 || parseInt(responseCode) > 299 && source == 'handler'
}

function isSnifferError(responseCode, { source }) {
    return parseInt(responseCode) < 200 || parseInt(responseCode) > 299 && source == 'sniffer'
}

function isSnifferSuccess(responseCode, { source }) {
    return parseInt(responseCode) >= 200 && parseInt(responseCode) <= 299 && source == 'sniffer'
}