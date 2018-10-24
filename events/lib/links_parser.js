import 'babel-polyfill';
import base64url from 'base64-url';
import * as url from 'url';
import * as cheerio from 'cheerio';
import cuid from 'cuid';
import omitEmpty from 'omit-empty';
import { logger } from './index';

class LinksParser {
  constructor({ apiHost, campaignId, context = {}, clicksHost } = {}) {
    this.apiHost = apiHost;
    this.clicksHost = clicksHost
    this.campaignId = campaignId || (context.campaign || {}).id;
    this.segmentId = (context.campaign || {}).segmentId;
    this.recipientId = (context.recipient || {}).id;
    this.listId = (context.recipient || {}).listId;
    this.userId = base64url.encode(context.userId || '');
    this.opensPath = 'links/open';
    this.clicksPath = 'links/click';
  }

  get opensTrackUrl() {
    if (this.apiHost) {
      const opensUrlObj = {
        protocol: 'https',
        hostname: this.apiHost,
        pathname: `${this.opensPath}/${this.campaignId}`
      };
      opensUrlObj.query = this._trackingQueryString();
      return url.format(opensUrlObj);
    }
  }

  appendOpensPixel(body) {
    return new Promise((resolve) => {
      if (this.opensTrackUrl) {
        const imgTag = `<img src="${this.opensTrackUrl}" width="1" height="1" />`;
        resolve(`${body} ${imgTag}`);
      } else {
        return resolve(body);
      }
    });
  }

  parseLinks(body) {
    return new Promise((resolve) => {
      const $ = cheerio.load(body, { decodeEntities: false });
      let campaignLinks = {
        id: this.campaignId,
        links: {}
      };
      $('a').each((i, link) => {
        if (!this._shouldBeSkipped($, link)) {
          const linkUrl = $(link).attr('href');
          const linkText = $(link).text() || '-';
          const linkId = cuid();
          const clickTrackUrl = this.clicksTrackUrl(linkId, linkUrl);
          $(link).attr('href', clickTrackUrl);
          campaignLinks.links[linkId] = { url: linkUrl, text: linkText };
        }
      });
      const result = {
        parsedBody: $.html(),
        campaignLinks
      };
      resolve(result);
    });
  }

  appendRecipientIdToLinks(body) {
    if (this.recipientId) {
      return new Promise((resolve, reject) => {
        const $ = cheerio.load(body, { decodeEntities: false });
        $('a').each((i, link) => this._appendTrackingInfo(link, $));
        return resolve($.html());
      });
    } else {
      return Promise.resolve(body);
    }
  }

  _appendTrackingInfo(link, $) {
    const linkUrl = $(link).attr('href') || '';
    const uri = url.parse(linkUrl, true);
    if (linkUrl && !this._isUnsubscribeLink(linkUrl) && !this._isReSubscribeLink(linkUrl) && this._isRedirectionLink(uri)) {
      delete uri.search;
      uri.query = Object.assign({}, uri.query, this._trackingQueryString());
      $(link).attr('href', uri.format());
    }
    if (linkUrl && this._isReSubscribeLink(linkUrl)) {
      const newList = uri.query.l
      delete uri.search;
      uri.query = Object.assign({}, uri.query, this._trackingQueryString(), { l: newList });
      $(link).attr('href', uri.format());
    }
  }

  _trackingQueryString() {
    return omitEmpty({ r: this.recipientId, u: this.userId, l: this.listId, s: this.segmentId });
  }

  _trackingReSubQueryString() {
    return omitEmpty({ r: this.recipientId, u: this.userId, s: this.segmentId });
  }

  _shouldBeSkipped($, link) {
    const linkUrl = $(link).attr('href');
    const trackingDisabled = $(link).attr('mm-disable-tracking') === 'true';
    const isMailtoLink = /^mailto:*/.test(linkUrl);
    return (!linkUrl || this._isUnsubscribeLink(linkUrl) || this._isReSubscribeLink(linkUrl) || trackingDisabled || isMailtoLink);
  }

  _isUnsubscribeLink(linkUrl) {
    return linkUrl && linkUrl.indexOf('unsubscribe_url') > -1;
  }

  _isReSubscribeLink(linkUrl) {
    return linkUrl && linkUrl.indexOf('resubscribe') > -1;
  }

  _isRedirectionLink(uri) {
    return uri.protocol === 'https:' && (this.apiHost.includes(uri.hostname) || this.clicksHost.includes(uri.hostname));
  }

  clicksTrackUrl(linkId, linkUrl) {
    if (this.clicksHost) {
      const clicksUrlObj = {
        protocol: 'https',
        hostname: this.clicksHost,
        pathname: `${this.clicksPath}/${this.campaignId}/${linkId}`,
        query: { url: linkUrl }
      };
      return url.format(clicksUrlObj).replace(/%7B%7B/g, '{{').replace(/%7D%7D/g, '}}');
    }
  }
}

module.exports.LinksParser = LinksParser;
