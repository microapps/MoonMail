import chai from 'chai';
import sinon from 'sinon';
import base64url from 'base64-url';
import R from 'ramda';
import * as handler from './handler';
import Api from './src/Api';
import ApiGatewayUtils from './src/lib/utils/ApiGatewayUtils';

const { expect } = chai;

describe('handler', () => {
  describe('.processSesNotification', () => {
    before(() => sinon.stub(Api, 'processSesNotification').resolves(true));
    after(() => Api.processSesNotification.restore());

    it('parses the SNS event and forwards it to Api.processSesNotification', (done) => {
      const event = { the: 'event' };
      const snsEvent = { Records: [{ Sns: { Message: JSON.stringify(event) } }] };
      handler.processSesNotification(snsEvent, {}, (err) => {
        if (err) return done(err);
        expect(Api.processSesNotification).to.have.been.calledWithExactly(event);
        return done();
      });
    });
  });

  describe('.processLinkClick', () => {
    before(() => sinon.stub(Api, 'processLinkClick').resolves(true));
    after(() => Api.processLinkClick.restore());
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const redirectUrl = 'https://github.com/microapps/moonmail';
    const url = encodeURIComponent(redirectUrl);
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const encodedUserId = base64url.encode(userId);
    const listId = 'list-id';
    const segmentId = 'segment-id';
    const httpHeaders = { 'User-Agent': 'Firefox' };
    const linkClick = { linkId, campaignId, userId, listId, recipientId, httpHeaders };
    const apiGatewayEvent = {
      headers: httpHeaders,
      pathParameters: { campaignId, linkId },
      queryStringParameters: { r: recipientId, u: encodedUserId, l: listId, s: segmentId, url }
    };

    it('parses the HTTP request and forwards it to Api.processLinkClick', (done) => {
      handler.processLinkClick(apiGatewayEvent, {}, (err) => {
        if (err) return done(err);
        expect(Api.processLinkClick).to.have.been.calledWithMatch(linkClick);
        return done();
      });
    });

    it('redirects to the redirection URL', (done) => {
      handler.processLinkClick(apiGatewayEvent, {}, (err, res) => {
        if (err) return done(err);
        const expected = ApiGatewayUtils.buildRedirectResponse({ url: redirectUrl });
        expect(res).to.deep.equal(expected);
        return done();
      });
    });

    context('when Api.processLinkClick fails', () => {
      before(() => Api.processLinkClick.rejects(new Error('Kaboom!')));

      it('redirects to the redirection URL', (done) => {
        handler.processLinkClick(apiGatewayEvent, {}, (err, res) => {
          if (err) return done(err);
          const expected = ApiGatewayUtils.buildRedirectResponse({ url: redirectUrl });
          expect(res).to.deep.equal(expected);
          return done();
        });
      });
    });

    context('when no redirection URL is specified', () => {
      it('redirects to MoonMail homepage', (done) => {
        const noUrlEvent = R.dissocPath(['queryStringParameters', 'url'], apiGatewayEvent);
        handler.processLinkClick(noUrlEvent, {}, (err, res) => {
          if (err) return done(err);
          const expected = ApiGatewayUtils.buildRedirectResponse({ url: 'https://moonmail.io' });
          expect(res).to.deep.equal(expected);
          return done();
        });
      });
    });

    context('when the redirection URL has no protocol', () => {
      it('adds https', (done) => {
        const noProtocolEvent = R.assocPath(['queryStringParameters', 'url'], 'moonmail.io', apiGatewayEvent);
        handler.processLinkClick(noProtocolEvent, {}, (err, res) => {
          if (err) return done(err);
          const expected = ApiGatewayUtils.buildRedirectResponse({ url: 'https://moonmail.io' });
          expect(res).to.deep.equal(expected);
          return done();
        });
      });
    });
  });

  describe('.processEmailOpen', () => {
    before(() => sinon.stub(Api, 'processEmailOpen').resolves(true));
    after(() => Api.processEmailOpen.restore());
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const encodedUserId = base64url.encode(userId);
    const listId = 'list-id';
    const segmentId = 'segment-id';
    const httpHeaders = { 'User-Agent': 'Firefox' };
    const emailOpen = { linkId, campaignId, userId, listId, recipientId, httpHeaders };
    const apiGatewayEvent = {
      headers: httpHeaders,
      pathParameters: { campaignId, linkId },
      queryStringParameters: { r: recipientId, u: encodedUserId, l: listId, s: segmentId }
    };

    it('parses the HTTP request and forwards it to Api.processEmailOpen', (done) => {
      handler.processEmailOpen(apiGatewayEvent, {}, (err) => {
        if (err) return done(err);
        expect(Api.processEmailOpen).to.have.been.calledWithMatch(emailOpen);
        return done();
      });
    });
  });

  describe('.persistEmailEvent', () => {
    before(() => sinon.stub(Api, 'persistEmailEvent').resolves(true));
    after(() => Api.persistEmailEvent.restore());

    it('parses the SNS event and forwards it to Api.persistEmailEvent', (done) => {
      const event = { type: 'event', payload: { the: 'payload' } };
      const snsEvent = { Records: [{ Sns: { Message: JSON.stringify(event) } }] };
      handler.persistEmailEvent(snsEvent, {}, (err) => {
        if (err) return done(err);
        expect(Api.persistEmailEvent).to.have.been.calledWithExactly(event);
        return done();
      });
    });
  });
});
