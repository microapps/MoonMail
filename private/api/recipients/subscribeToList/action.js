import base64url from 'base64-url';
import omitEmpty from 'omit-empty';
import request from 'request-promise';
import { List } from 'moonmail-models';
import qs from 'qs';
import { ListSubscribeService } from '../lib/list_subscribe_service';
import { debug } from '../../../lib/index';
import { ApiErrors } from '../../../lib/errors';

export function respond(event, cb) {
  debug('= subscribeToList.action', JSON.stringify(event));
  const params = getParameters(event);
  if (params.listId && params.recipient && params.encodedUserId) {
    const userId = base64url.decode(params.encodedUserId);
    return List.get(userId, params.listId)
      .then((list) => {
        const newRecipient = Object.assign({}, params.recipient, { userId });
        delete newRecipient.u;
        return discoverFieldsFromRequestMetadata(JSON.parse(event.headers))
          .then(systemMetadata => Object.assign({}, newRecipient, { systemMetadata }))
          .then(recipientWithSystemMetadata => ListSubscribeService.subscribe(list, recipientWithSystemMetadata, userId))
          .then(() => handleResponse(null, { listName: list.name }, event, cb))
          .catch((err) => {
            if (err.name === 'RecipientAlreadyExists') {
              return handleResponse({ email: 'E-mail address already exists!' }, null, event, cb);
            } else {
              return handleResponse(err, null, event, cb);
            }
          });
      });
  } else {
    return handleResponse(new Error('Missing params'), null, event, cb);
  }
}

function findDetectedDevice(metadata) {
  if (metadata['CloudFront-Is-Desktop-Viewer'] === 'true') { return 'desktop'; }
  if (metadata['CloudFront-Is-Mobile-Viewer'] === 'true') { return 'mobile'; }
  if (metadata['CloudFront-Is-SmartTV-Viewer'] === 'true') { return 'smartTv'; }
  if (metadata['CloudFront-Is-Tablet-Viewer'] === 'true') { return 'tablet'; }
  return 'unknown';
}

function discoverFieldsFromRequestMetadata(requestMetadata) {
  const cfIpAddress = (requestMetadata['X-Forwarded-For'] || ',').split(',').shift().trim();
  const acceptLanguage = (requestMetadata['Accept-Language'] || ',').split(',').shift().trim();
  const language = (acceptLanguage || '_').split(/\-|_/).shift().trim();
  const updatedMetadata = omitEmpty({
    ip: cfIpAddress,
    countryCode: requestMetadata['CloudFront-Viewer-Country'],
    acceptLanguageHeader: requestMetadata['Accept-Language'],
    acceptLanguage,
    language,
    detectedDevice: findDetectedDevice(requestMetadata),
    userAgent: requestMetadata['User-Agent']
  });
  if (updatedMetadata.userAgent.match(/Zapier/)) return Promise.resolve({});
  return request(`https://freegeoip.net/json/${cfIpAddress}`)
    .then(result => JSON.parse(result))
    .then(geoLocationData => omitEmpty(Object.assign({}, updatedMetadata, {
      countryName: geoLocationData.country_name,
      regionCode: geoLocationData.region_code,
      regionName: geoLocationData.region_name,
      city: geoLocationData.city,
      zipCode: geoLocationData.zip_code,
      timeZone: geoLocationData.time_zone,
      location: {
        lat: geoLocationData.latitude,
        lon: geoLocationData.longitude
      },
      metroCode: geoLocationData.metro_code
    }))).catch(error => Promise.resolve({})); // Avoid breaking the request if freegeoip fails
}

function getParameters(event) {
  return event.json ? event : getFormParameters(event);
}

function getFormParameters(event) {
  const recipient = qs.parse(event.recipient);
  const encodedUserId = recipient.u;
  return { recipient, encodedUserId, listId: event.listId };
}

function handleResponse(error, success, event, cb) {
  if (event.json) {
    return ajaxResponse(error, success, cb);
  } else {
    return redirectResponse(error, success, cb);
  }
}

function ajaxResponse(error, success, cb) {
  if (error) {
    const errorCode = error.code;
    if (errorCode !== 'MessageRejected' && errorCode !== 'Throttling') return cb(ApiErrors.response(error));
    return cb(ApiErrors.response({
      status: 429,
      message: 'Daily message quota exceeded. No more double opt in confirmation emails can be sent to recipients on your MoonMail account.'
    }));
  }
  return cb(null, success);
}

function redirectResponse(error, success, cb) {
  const url = error ? process.env.ERROR_PAGE : process.env.SUCCESS_PAGE;
  return cb(null, url);
}
