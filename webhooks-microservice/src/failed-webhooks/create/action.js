'use strict';

import AWS from 'aws-sdk'
import uuid from 'uuid'

export default async function create(data) {
    try {
        data.id = uuid.v1()
        data.createdAt = new Date().getTime()
        data.updatedAt = new Date().getTime()

        const params = {
            TableName: process.env.FAILEDREQUESTTABLENAME,
            Item: data
        };

        const dynamoDb = new AWS.DynamoDB.DocumentClient()

        await dynamoDb.put(params).promise()
        return data
    } catch (e) {
        throw e.toString()
    }
}