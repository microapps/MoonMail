'use strict';

import AWS from 'aws-sdk'

export default async function queryAll(expressionValue) {
    try {
        const params = {
            TableName: process.env.WEBHOOKTABLENAME,
            IndexName: 'wb-index',
            KeyConditionExpression: 'wb = :wb',
            ExpressionAttributeValues: { ':wb': expressionValue }
        }
        
        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        return await dynamoDb.query(params).promise()
    } catch (e) {
        throw e.toString()
    }
};