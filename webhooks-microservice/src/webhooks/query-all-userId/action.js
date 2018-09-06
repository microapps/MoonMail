'use strict';

import AWS from 'aws-sdk'

export default async function queryAllUserId(expressionValue) {
    try {
        const params = {
            TableName: process.env.WEBHOOKTABLENAME,
            IndexName: 'userId-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': expressionValue }
        }
        
        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        return await dynamoDb.query(params).promise()
    } catch (e) {
        throw e.toString()
    }
}