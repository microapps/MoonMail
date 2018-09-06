'use strict';

import AWS from 'aws-sdk'

export default async function update(id, data) {
    try {
        data.id = id
        data.updatedAt = new Date().getTime()
        const itemId = data.itemId || ''
        data.wb = `${data.event}-${data.item}-${itemId}`

        const updateParams = {
            TableName: process.env.WEBHOOKTABLENAME,
            Item: data
        }

        const getParams = {
            TableName: process.env.WEBHOOKTABLENAME,
            Key: {
                id
            }
        }

        const dynamoDb = new AWS.DynamoDB.DocumentClient()
        await dynamoDb.put(updateParams).promise()
        return await dynamoDb.get(getParams).promise()
    } catch (e) {
        throw e.toString()
    }
}