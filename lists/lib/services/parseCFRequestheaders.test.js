import '../specHelper';
import parseCFRequestHeaders from './parseCFRequestHeaders';

describe('parseCFRequestHeaders', () => {
  const testCases = [
    {
      input: {
        'CloudFront-Is-Desktop-Viewer': 'true',
        'X-Forwarded-For': '192.168.0.1, 200.200.200.200',
        'Accept-Language': 'en-us, en;q=0.9, es;q=0.8',
        'CloudFront-Viewer-Country': 'Spain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0'
      },
      expectedResult: {
        ip: '192.168.0.1',
        countryCode: 'Spain',
        acceptLanguageHeader: 'en-us, en;q=0.9, es;q=0.8',
        acceptLanguage: 'en-us',
        language: 'en',
        detectedDevice: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0'
      }
    },
    {
      input: {
        'CloudFront-Is-Desktop-Viewer': 'true',
        'X-Forwarded-For': '192.168.0.1',
        'Accept-Language': 'en',
        'CloudFront-Viewer-Country': 'Spain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0'
      },
      expectedResult: {
        ip: '192.168.0.1',
        countryCode: 'Spain',
        acceptLanguageHeader: 'en',
        acceptLanguage: 'en',
        language: 'en',
        detectedDevice: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0'
      }
    },
    {
      input: {
        'CloudFront-Is-Desktop-Viewer': 'true',
        'X-Forwarded-For': '192.168.0.1',
        'Accept-Language': 'en_us',
        'CloudFront-Viewer-Country': 'Spain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)'
      },
      expectedResult: {
        ip: '192.168.0.1',
        countryCode: 'Spain',
        acceptLanguageHeader: 'en_us',
        acceptLanguage: 'en_us',
        language: 'en',
        detectedDevice: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)'
      }
    }
  ];

  it('finds required information from the headers', () => {
    testCases.forEach((testCase) => {
      const result = parseCFRequestHeaders(testCase.input);
      expect(result).to.deep.equals(testCase.expectedResult);
    });
  });
});
