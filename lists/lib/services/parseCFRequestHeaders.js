import omitEmpty from 'omit-empty';

function findDetectedDevice(metadata) {
  if (metadata['CloudFront-Is-Desktop-Viewer'] === 'true') { return 'desktop'; }
  if (metadata['CloudFront-Is-Mobile-Viewer'] === 'true') { return 'mobile'; }
  if (metadata['CloudFront-Is-SmartTV-Viewer'] === 'true') { return 'smartTv'; }
  if (metadata['CloudFront-Is-Tablet-Viewer'] === 'true') { return 'tablet'; }
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
