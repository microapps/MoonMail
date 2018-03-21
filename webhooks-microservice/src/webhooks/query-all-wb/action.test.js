

import AWS from 'aws-sdk'
import * as chai from 'chai'
import queryAllWb from './action'

const expect = chai.expect

describe('reads all webhooks', () => {
    const register1 = { subject: "list", subjectId: "1", event: "subscribe", webhook: "update-test1.com/webhook", userID: 'abc-123', createdAt: 'day1', updatedAt: 'day1' }
    const register2 = { subject: "list", subjectId: "2", event: "subscribe", webhook: "update-test2.com/webhook", userID: 'abc-123', createdAt: 'day2', updatedAt: 'day2' }
    const data = [register1, register2]

    const successConnection = function () {
        return {
            query: () => ({
                    promise: async () => data
                })
        }
    }

    const failureConnection = function () {
        return {
            query: () => ({
                    promise: async () => { throw 'error' }
                })
        }
    }

    describe('#scan()', () => {

        context('when the event is valid all webhooks should be retrieved', () => {
            before(() => {
                AWS.DynamoDB.DocumentClient = successConnection
            })

            it('should register a webhook', async () => {
                const webhooks = await queryAllWb()

                expect(webhooks).to.have.length(2)
                expect(webhooks[0]).to.have.property('subject')
                expect(webhooks[0].subject).to.be.equal('list')
                expect(webhooks[0]).to.have.property('subjectId')
                expect(webhooks[0].subjectId).to.be.equal('1')
                expect(webhooks[0]).to.have.property('event')
                expect(webhooks[0].event).to.be.equal('subscribe')
                expect(webhooks[0]).to.have.property('webhook')
                expect(webhooks[0].webhook).to.be.equal('update-test1.com/webhook')
                expect(webhooks[0]).to.have.property('userID')
                expect(webhooks[0].userID).to.be.equal('abc-123')
                expect(webhooks[0]).to.have.property('createdAt')
                expect(webhooks[0].createdAt).to.be.equal('day1')
                expect(webhooks[0]).to.have.property('updatedAt')
                expect(webhooks[0].updatedAt).to.be.equal('day1')
                expect(webhooks[1]).to.have.property('subject')
                expect(webhooks[1].subject).to.be.equal('list')
                expect(webhooks[1]).to.have.property('subjectId')
                expect(webhooks[1].subjectId).to.be.equal('2')
                expect(webhooks[1]).to.have.property('event')
                expect(webhooks[1].event).to.be.equal('subscribe')
                expect(webhooks[1]).to.have.property('webhook')
                expect(webhooks[1].webhook).to.be.equal('update-test2.com/webhook')
                expect(webhooks[1]).to.have.property('userID')
                expect(webhooks[1].userID).to.be.equal('abc-123')
                expect(webhooks[1]).to.have.property('createdAt')
                expect(webhooks[1].createdAt).to.be.equal('day2')
                expect(webhooks[1]).to.have.property('updatedAt')
                expect(webhooks[1].updatedAt).to.be.equal('day2')
            })
        })

        context('when connection goes wrong, an error should be thrown', () => {
            before(() => {
                AWS.DynamoDB.DocumentClient = failureConnection
            })

            it('should throw an error', async () => {
                try {
                    await queryAllWb()
                } catch (e) {
                    expect(e).to.equal('error')
                }
            })
        })
    })
})