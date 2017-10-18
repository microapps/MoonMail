import request from 'request-promise';

export default function getGeoInformationFromIp(ipAddress) {
  return request(`https://freegeoip.net/json/${ipAddress}`)
    .then(result => JSON.parse(result));
}