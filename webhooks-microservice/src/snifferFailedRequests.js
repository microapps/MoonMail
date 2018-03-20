import AWS from 'aws-sdk'
import { readAll, remove } from './failed-webhooks/webhook-handler'
import { readOne } from './webhooks/webhook-handler'

module.exports.sniffFailedWebhookRequests = (event, context, callback) => {

    readAll()
        .then(checkRequests)
        .then(filterRequests)
        .then(invokeAllRequests)
        .then(removeOldRequests)
        .then(r => callback(null))
        .catch(e => handleError(e, callback))
}

const handleError = (e, callback) => {
    if (e === 'NO-FAILED-REQUESTS-FOUND') {
        console.log(e)
        callback(null)
    } else {
        callback(e)
    }
}

const checkTotalAttempts = (failedRequest) => {
    return (parseInt(failedRequest.totalAttempts) >= parseInt(process.env.MAXREQUESTATTEMPTS))
}

const checkTimer = (failedRequest) => {
    const timeToCall = parseInt(failedRequest.updatedAt) + parseInt(failedRequest.timer)
    const now = new Date().getTime()
    if (now >= timeToCall) return true
    else return false
}

const removeRequest = async (failedRequest) => {
    try {
        await remove(failedRequest.id)
    } catch (e) {
        console.log(e)
    }
}

const invokeTrigger = async (payload) => {
    const lambda = new AWS.Lambda()
    const result = await lambda.invoke({ FunctionName: process.env.TRIGGERWBFUNCTIONNAME, InvocationType: 'Event', Payload: JSON.stringify(payload) }).promise()
    return true
}

const checkRequests = (requests) => {
    if (requests && requests.Items && requests.Items.length > 0) return requests.Items
    else throw 'NO-FAILED-REQUESTS-FOUND'
}

const checkRequestWebhookExistence = async (request) => {
    try {
        const webhook = JSON.parse(request.webhook)
        const existingWebhook = await readOne(webhook.id)
        if (!existingWebhook || !existingWebhook.Item || existingWebhook.Item.wb != webhook.wb || existingWebhook.Item.webhook != webhook.webhook) { return false }
        return true
    } catch (e) {
        console.log(e)
    }
}

const invokerPayload = (failedRequest) => {
    const webhook = JSON.parse(failedRequest.webhook)
    delete failedRequest.webhook
    return {
        webhook: webhook,
        failedRequest: failedRequest,
        source: 'sniffer',
        attempts: 1
    }
}

//todo: consider rebuilding, messy code
const filterRequests = async (failedRequests) => { //remove old registers, check timer, create lists of promises
    try {
        let failedRequestsPromises = []
        let removableRequests = []

        for (const i in failedRequests) {
            if (!await checkRequestWebhookExistence(failedRequests[i])) {
                removableRequests.push(removeRequest(failedRequests[i]))
            }
            else if (checkTotalAttempts(failedRequests[i])) {
                removableRequests.push(removeRequest(failedRequests[i]))
            }
            else if (checkTimer(failedRequests[i])) {
                const payload = invokerPayload(failedRequests[i])
                failedRequestsPromises.push(invokeTrigger(payload))
            }
        }

        return { failedRequestsPromises, removableRequests }
    } catch (e) {
        throw e
    }
}

const invokeAllRequests = async (promises) => {
    try {
        await Promise.all(promises.failedRequestsPromises)
        return promises
    } catch (e) {
        throw e
    }
}

const removeOldRequests = async (promises) => {
    try {
        await Promise.all(promises.removableRequests)
        return true
    } catch (e) {
        throw e
    }
}