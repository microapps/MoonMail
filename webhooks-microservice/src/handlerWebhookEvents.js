import AWS from 'aws-sdk'
import { queryAllWb } from './webhooks/webhook-handler'

module.exports.handlerWebhookEvents = (event, context, callback) => {
    // event = [
    //     { event: 'unsubscribe', item: 'list', itemId: '1', userId: '321' },
    //     { event: 'sent', item: 'campaign', itemId: 'abc', userId: '' }
    // ]

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

const setEventUserID = async (items, newUserId) => {
    if (items && items.length > 0 && newUserId) {
        for (const i in items) {
            items[i].userId = newUserId
        }
        return items
    } 
        return items
    
}

const dbParams = (event) => {
    const itemId = event.itemId || ''
    return `${event.event  }-${  event.item  }-${  itemId}`
}

const readAllAndSetUserID = async (event) => { // switches webhook userID (creator) to event userID (the one related to the event)
    try {
        const params = dbParams(event)
        const { Items } = await queryAllWb(params)
        return await setEventUserID(Items, event.userId)
    } catch (e) {
        throw e
    }
}

const getWebhooks = async (events) => {
    try {
        const dbPromises = []

        for (const i in events) {
            const promise = readAllAndSetUserID(events[i])
            dbPromises.push(promise)
        }

        return await Promise.all(dbPromises)
    } catch (e) {
        throw e
    }
}

const reduceWebhooks = async (webhooks) => webhooks.reduce((wb1, wb2) => [...wb1, ...wb2])

const checkWebhooks = async (webhooks) => {
    if (webhooks && webhooks.length > 0) {
        return webhooks
    } 
        throw 'NO-WEBHOOKS-FOUND'
    
}

const invokerPayload = (webhook) => ({
        webhook,
        source: 'handler',
        attempts: process.env.REQUESTATTEMPTS
    })

const invokeAllWebhooks = async (webhooks) => { // consider recursion for big pile of webhooks
    try {
        const webhookPromises = []
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