import omitEmpty from 'omit-empty';
import getGeoInformationFromIp from '../../services/getGeoInformationFromIp';
import parseCFRequestHeaders from '../../services/parseCFRequestHeaders';

export default async function buildRecipientSystemMetadata(requestHeaders) {
  const systemMetadata = await parseCFRequestHeaders(requestHeaders);
  const geoLocationData = await getGeoInformationFromIp(systemMetadata.ip);
  return omitEmpty(Object.assign({}, systemMetadata, {
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
  }));
}
