import request from 'request-promise';
import omitEmpty from 'omit-empty';

export default function parseRequestMetadata(requestMetadata) {
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

  return getGeolocationData(cfIpAddress)
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
    })));
}

function getGeolocationData(ipAddress) {
  return request(`https://freegeoip.net/json/${ipAddress}`)
    .then(result => JSON.parse(result));
}

function findDetectedDevice(metadata) {
  if (metadata['CloudFront-Is-Desktop-Viewer'] === 'true') { return 'desktop'; }
  if (metadata['CloudFront-Is-Mobile-Viewer'] === 'true') { return 'mobile'; }
  if (metadata['CloudFront-Is-SmartTV-Viewer'] === 'true') { return 'smartTv'; }
  if (metadata['CloudFront-Is-Tablet-Viewer'] === 'true') { return 'tablet'; }
  return 'unknown';
}
