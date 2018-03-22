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
        userId: webhook.userId
    })

const failedRequestParams = (webhook, totalAttempts = 0, timer = process.env.REQUESTTIMER) => ({
        timer: timer * process.env.REQUESTTIMERMULTIPLIER,
        webhook: JSON.stringify(webhook),
        totalAttempts: parseInt(totalAttempts)+1
    })

const handleResponseCode = async (responseCode, event) => {
    if (parseInt(responseCode) < 200 || parseInt(responseCode) > 299 && event.source == 'handler') {
        const dbData = failedRequestParams(event.webhook)
        await create(dbData)
        return true
    }
    if (parseInt(responseCode) < 200 || parseInt(responseCode) > 299 && event.source == 'sniffer') {
        const dbData = failedRequestParams(event.webhook, event.failedRequest.totalAttempts, event.failedRequest.timer)
        dbData.createdAt = event.failedRequest.createdAt
        await update(event.failedRequest.id, dbData)
        return true
    }
    if (parseInt(responseCode) >= 200 && parseInt(responseCode) <= 299 && event.source == 'sniffer') {
        await remove(event.failedRequest.id)
    } else {
        return true
    }
}