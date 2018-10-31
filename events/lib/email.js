import omitEmpty from 'omit-empty';
import base64url from 'base64-url';
import * as Liquid from 'liquid-node';
import * as url from 'url';
import { debug } from './index';
import formatAddress from './formatAddress';

const liquid = new Liquid.Engine();

class Email {
  constructor({ fromEmail, fromName, to, body, subject, metadata, recipientId, listId, campaignId, userId, userPlan, list } = {}, options = { footer: true }) {
    this.from = fromEmail;
    this.fromName = fromName;
    this.to = to;
    this.body = body;
    this.subject = subject;
    this.metadata = metadata;
    this.listId = listId;
    this.userId = userId;
    this.recipientId = recipientId;
    this.campaignId = campaignId;
    this.apiHost = process.env.API_HOST;
    this.unsubscribeApiHost = process.env.UNSUBSCRIBE_API_HOST;
    this.options = options;
    this.opensPath = 'links/open';
    this.list = list,
    this.userPlan = userPlan
  }

  async renderBody() {
    debug('= Email.renderBody', 'Rendering body with template', this.body, 'and metadata', this.metadata);
    const unsubscribeUrl = this._buildUnsubscribeUrl();
    const resubscribeUrl = await this._buildReSubscribeUrl();

    const contact = this.list.contact || {}

    const extraFields = {
      subject: this.subject,
      recipient_email: this.to || '',
      from_email: this.from || '',
      unsubscribe_url: unsubscribeUrl || '',
      resubscribe_url: resubscribeUrl || '',
      list_address: this._address(contact, this.metadata.country) || '',
      list_description: contact.description || '',
      list_name: this.list.name || '',
      list_company: contact.company || '',
      list_url: contact.websiteUrl || '',
      footer: this._paidFooter(contact, unsubscribeUrl, this.to)
    };
    const metadata = Object.assign({}, this.metadata, extraFields);
    return liquid.parseAndRender(this.body, metadata)
      .then(parsedBody => {
        return this._appendFooter(parsedBody, this.list.contact)
      });
  }

  renderSubject() {
    debug('= Email.renderSubject', 'Rendering subject with template', this.subject, 'and metadata', this.metadata);
    return liquid.parseAndRender(this.subject, this.metadata);
  }

  get unsubscribeUrl() {
    return this._buildUnsubscribeUrl();
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

  _trackingQueryString() {
    return omitEmpty({ r: this.recipientId, u: this.userId, l: this.listId, s: this.segmentId });
  }

  _appendFooter(body, contact) {
    return new Promise((resolve) => {
      if (this.options.footer) {
        const footer = this._buildFooter(contact, this._buildUnsubscribeUrl(), this.to);
        resolve(`${body} ${footer}`);
      } else {
        resolve(body);
      }
    });
  }

  _buildUnsubscribeUrl() {
    const unsubscribePath = `lists/${this.listId}/recipients/${this.recipientId}/unsubscribe`;
    const unsubscribeUrl = {
      protocol: 'https',
      hostname: this.unsubscribeApiHost,
      pathname: unsubscribePath,
      query: { cid: this.campaignId }
    };
    return url.format(unsubscribeUrl);
  }

  async _buildReSubscribeUrl() {
    if (this.body.indexOf('resubscribe_url') == -1) { return '' }
    const list = await this._createReSubscribeList()
    const resubscribePath = `lists/${this.listId}/recipients/${this.recipientId}/resubscribe`;
    const resubscribeUrl = {
      protocol: 'https',
      hostname: this.unsubscribeApiHost,
      pathname: resubscribePath,
      query: { cid: this.campaignId, l: list.id }
    };
    return url.format(resubscribeUrl);
  }

  async _createReSubscribeList() {
    const newListId = base64url.encode(this.listId + 'resubscribe')
    const existingList = this.list
    const newList = Object.assign({}, existingList)
    newList.id = newListId
    const existingNewList = await List.get(this.userId, newListId)
    if (existingNewList.id) { return existingNewList }
    newList.name = newList.name + ' RESUBSCRIBE'
    newList.importStatus = {}
    newList.awaitingConfirmation = 0
    newList.bouncedCount = 0
    newList.subscribedCount = 0
    newList.total = 0
    newList.unsubscribedCount = 0
    await List.save(newList)
    return newList
  }

  _buildFooter(contact, unsubscribeUrl, recipientEmail) {
    return `<div style="margin: 20px auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
    <!--[if mso]>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]-->
    <div style="line-height: 21px; font-size: 14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:center;margin: 0; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
      <p>${contact.description || ''}</p>
      <p>
        <a href="${unsubscribeUrl || ''}"
          style="color:rgb(64,64,64)!important"
          target="_blank"
          rel="noopener noreferrer">Unsubscribe</a> ${recipientEmail || ''} from this list.
      </p>
      <p>
        Our mailing address is:<br />
        ${this._address(contact, this.metadata.country)}
      </p>
      <p>
        Copyright (C) ${ new Date().getFullYear()} <a href="${contact.websiteUrl || ''}"
                                                  style="color:rgb(64,64,64)!important"
                                                  target="_blank"
                                                  rel="noopener noreferrer">${contact.company || ''}</a>. All rights reserved.
      </p>
      <p>
        <a href="https://moonmail.io/?utm_source=newsletter&utm_medium=moonmail-user&utm_campaign=user-campaigns"
          target="_blank"
          rel="noopener noreferrer">
          <img src="https://static.moonmail.io/moonmail-logo.png"
              border="0"
              alt="Email Marketing Powered by MoonMail"
              title="MoonMail Email Marketing"
              width="130"
              height="28" />
        </a>
      </p>
      <!--[if mso]></td></tr></table><![endif]-->
    </div>`;
  }

  _paidFooter(contact = {}, unsubscribeUrl, recipientEmail, ) {
    if(this._isFreeUser(this.userPlan)) return ''

    if (!this.options.footer) {
      return `<div style="margin: 20px auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
      <!--[if mso]>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]-->
      <div style="line-height: 21px; font-size: 14px;color:#555555;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;text-align:center;margin: 0; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">
        <p>${contact.description || ''}</p>
        <p>
          <a href="${unsubscribeUrl || ''}"
            style="color:rgb(64,64,64)!important"
            target="_blank"
            rel="noopener noreferrer">Unsubscribe</a> ${recipientEmail || ''} from this list.
        </p>
        <p>
          Our mailing address is:<br />
          ${this._address(contact, this.metadata.country)}
        </p>
        <p>
          Copyright (C) ${ new Date().getFullYear()} <a href="${contact.websiteUrl || ''}"
                                                    style="color:rgb(64,64,64)!important"
                                                    target="_blank"
                                                    rel="noopener noreferrer">${contact.company || ''}</a>. All rights reserved.
        </p>
        <!--[if mso]></td></tr></table><![endif]-->
      </div>`
    } else {
      return ''
    }
  }

  _address(contact, recipientCountry) {
    return formatAddress({
      company: contact.company || '',
      address: contact.address || '',
      address2: contact.address2 || '',
      city: contact.city || '',
      state: contact.state || '',
      zipCode: contact.zipCode || '',
      country: contact.country || ''
    }, recipientCountry)
  }

  _isFreeUser(userPlan) {
    const freePlanRegex = /free/;
    return (!userPlan) || (userPlan.match(freePlanRegex)) || (userPlan === 'staff');
  }

}

module.exports.Email = Email;
