import chai from 'chai';
import sinon from 'sinon';
import base64url from 'base64-url';
import * as handler from './handler';
import Api from './src/Api';

const { expect } = chai;

describe('handler', () => {
  describe('processSesNotification', () => {
    before(() => sinon.stub(Api, 'processSesNotification').resolves(true));
    after(() => Api.processSesNotification.restore());

    it('parses the SNS event and forwards it to Api.processSesNotification', (done) => {
      const event = { the: 'event' };
      const snsEvent = { Records: [{ Sns: { Message: JSON.stringify(event) } }] };
      handler.processSesNotification(snsEvent, {}, (err, res) => {
        if (err) return done(err);
        expect(Api.processSesNotification).to.have.been.calledWithExactly(event);
        done();
      });
    });
  });

  describe('processLinkClick', () => {
    before(() => sinon.stub(Api, 'processLinkClick').resolves(true));
    after(() => Api.processLinkClick.restore());
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const redirectUrl = 'https://moonmail.io';
    const url = encodeURIComponent(redirectUrl);
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const encodedUserId = base64url.encode(userId);
    const listId = 'list-id';
    const segmentId = 'segment-id';
    const httpHeaders = { 'User-Agent': 'Firefox' };

    it('parses the HTTP request and forwards it to Api.processLinkClick', (done) => {
      const linkClick = { linkId, campaignId, userId, listId, recipientId, httpHeaders };
      const apiGatewayEvent = {
        headers: httpHeaders,
        pathParameters: { campaignId, linkId },
        queryStringParameters: { r: recipientId, u: encodedUserId, l: listId, s: segmentId, url }
      };
      handler.processLinkClick(apiGatewayEvent, {}, (err) => {
        if (err) return done(err);
        expect(Api.processLinkClick).to.have.been.calledWithMatch(linkClick);
        done();
      });
    });

    it('redirects to the redirection URL', () => {

    });
  });
});
