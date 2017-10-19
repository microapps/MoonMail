import nock from 'nock';
import '../specHelper';
import getGeoInformationFromIp from './getGeoInformationFromIp';

describe('getGeoInformationFromIp', () => {
  let freeGeoIpApi;
  const ipAddress = '127.0.0.1';
  const expectedResponse = { some: 'response' };

  before(() => {
    freeGeoIpApi = nock('https://freegeoip.net');
    freeGeoIpApi
      .get(`/json/${ipAddress}`)
      .reply(200, JSON.stringify(expectedResponse));
  });

  after(() => {
    nock.cleanAll();
  });

  it('delegates calls to the freegeoip api', async () => {
    const result = await getGeoInformationFromIp(ipAddress);
    expect(result).to.deep.equals(expectedResponse);
  });
});
