import omitEmpty from 'omit-empty';

function findDetectedDevice(headers) {
  if (headers['CloudFront-Is-Desktop-Viewer'] === 'true') { return 'desktop'; }
  if (headers['CloudFront-Is-Mobile-Viewer'] === 'true') { return 'mobile'; }
  if (headers['CloudFront-Is-SmartTV-Viewer'] === 'true') { return 'smartTv'; }
  if (headers['CloudFront-Is-Tablet-Viewer'] === 'true') { return 'tablet'; }
  return 'unknown';
}

export default function parseCFRequestHeaders(requestHeaders) {
  const cfIpAddress = (requestHeaders['X-Forwarded-For'] || ',').split(',').shift().trim();
  const acceptLanguage = (requestHeaders['Accept-Language'] || ',').split(',').shift().trim();
  const language = (acceptLanguage || '_').split(/\-|_/).shift().trim();
  return omitEmpty({
    ip: cfIpAddress,
    countryCode: requestHeaders['CloudFront-Viewer-Country'],
    acceptLanguageHeader: requestHeaders['Accept-Language'],
    acceptLanguage,
    language,
    detectedDevice: findDetectedDevice(requestHeaders),
    userAgent: requestHeaders['User-Agent']
  });
}
