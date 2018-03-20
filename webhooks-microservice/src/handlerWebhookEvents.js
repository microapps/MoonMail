import AWS from 'aws-sdk'
import { queryAll } from './webhooks/webhook-handler'

module.exports.handlerWebhookEvents = (event, context, callback) => {
    event = [
        { event: 'unsubscribe', subject: 'list', subjectID: '1', userID: '321' },
        { event: 'sent', subject: 'campaign', subjectID: 'abc', userID: '' }
    ]

    getWebhooks(event)
        .then(checkWebhooks)
        .then(reduceWebhooks)
        .then(checkWebhooks)
        .then(invokeAllWebhooks)
        .then(r => callback(null))
        .catch(e => handleError(e, callback))
}

const handleError = (e, callback) => {
    if (e === 'NO-WEBHOOKS-FOUND') {
        console.log(e)
        callback(null)
    } else {
        callback(e)
    }
}

const setEventUserID = async (items, newUserID) => {
    if (items && items.length > 0 && newUserID) {
        for (const i in items) {
            items[i].userID = newUserID
        }
        return items
    } else {
        return items
    }
}

const dbParams = (event) => {
    const subjectID = event.subjectID || ''
    return event.event + '-' + event.subject + '-' + subjectID
}

const readAllAndSetUserID = async (event) => { //switches webhook userID (creator) to event userID (the one related to the event)
    try {
        const params = dbParams(event)
        const { Items } = await queryAll(params)
        return await setEventUserID(Items, event.userID)
    } catch (e) {
        throw e
    }
}

const getWebhooks = async (events) => {
    try {
        let dbPromises = []

        for (const i in events) {
            let promise = readAllAndSetUserID(events[i])
            dbPromises.push(promise)
        }

        return await Promise.all(dbPromises)
    } catch (e) {
        throw e
    }
}

const reduceWebhooks = async (webhooks) => {
    return webhooks.reduce((wb1, wb2) => [...wb1, ...wb2])
}

const checkWebhooks = async (webhooks) => {
    if (webhooks && webhooks.length > 0) {
        return webhooks
    } else {
        throw 'NO-WEBHOOKS-FOUND'
    }
}

const invokerPayload = (webhook) => {
    return {
        webhook: webhook,
        source: 'handler',
        attempts: process.env.REQUESTATTEMPTS
    }
}

const invokeAllWebhooks = async (webhooks) => { // consider recursion for big pile of webhooks
    try {
        let webhookPromises = []
        for (const i in webhooks) {
            const payload = invokerPayload(webhooks[i])
            webhookPromises.push(invokeTrigger(payload))
        }

        await Promise.all(webhookPromises)
        return true
    } catch (e) {
        throw e
    }
}

const invokeTrigger = async (payload) => {
    const lambda = new AWS.Lambda()
    const result = await lambda.invoke({ FunctionName: process.env.TRIGGERWBFUNCTIONNAME, InvocationType: 'Event', Payload: JSON.stringify(payload) }).promise()
    return true
}