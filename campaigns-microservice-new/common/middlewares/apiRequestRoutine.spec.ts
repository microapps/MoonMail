import {
  addAuthorizerContext, apiRequestRoutine, buildErrorResponse,
  buildJSONResponse,
  setDefaultParams
} from './apiRequestRoutine';
import {NotFound} from 'http-errors';
import {AuthorizedEvent, NormalizedEvent} from '../@types';
import middy from 'middy';

describe('apiRequestRoutine', () => {
  let demoEvent: AuthorizedEvent;
  beforeEach(() => {
    demoEvent = {
      resource: '/account',
      path: '/account',
      httpMethod: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'valid_token'
      },
      queryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        resourceId: 'una98p',
        authorizer: {
          principalId: 'auth0|56cf10321c4c7f2e2fb264aa',
          userId: 'auth0|56cf10321c4c7f2e2fb264aa'
        },
        resourcePath: '/account',
        httpMethod: 'POST',
        path: '/dev/account',
        accountId: '862946620411',
        stage: 'dev',
        requestTimeEpoch: 1539156810614,
        requestId: 'c901f211-cc5e-11e8-b7a5-4bcd36c6e6f3',
        identity: {
          apiKey: null,
          apiKeyId: null,
          cognitoIdentityPoolId: null,
          accountId: null,
          cognitoIdentityId: null,
          caller: null,
          sourceIp: '35.167.74.121',
          accessKey: null,
          cognitoAuthenticationType: null,
          cognitoAuthenticationProvider: null,
          userArn: null,
          userAgent: 'axios/0.15.2',
          user: null
        },
        apiId: 'q27n90kff1'
      },
      body: "{\"foo\":\"bar\"}",
      isBase64Encoded: false
    };
  });

  it('addAuthorizerContext should assign user object to the event', () => {
    addAuthorizerContext(demoEvent);
    expect(demoEvent.user).toEqual(demoEvent.requestContext.authorizer)
  });

  it('setDefaultParams should set default query and path parameters', () => {
    setDefaultParams(demoEvent);
    expect(demoEvent.queryStringParameters).toEqual({});
    expect(demoEvent.pathParameters).toEqual({});
  });

  it('buildJSONResponse should build a correct response object', () => {
    expect(buildJSONResponse({foo: 'bar'})).toMatchSnapshot()
  });

  it('buildErrorResponse should build a correct response object in case of the internal error', () => {
    expect(buildErrorResponse(new Error('Some internal error'))).toMatchSnapshot()
  });

  it('buildErrorResponse should build a correct response object in case of the http error', () => {
    expect(buildErrorResponse(new NotFound('Recourse not found'))).toMatchSnapshot()
  });

  it('should normalize event', () => {
    const handler = middy(async(event: NormalizedEvent) => {
      expect(event).toMatchSnapshot();
    });
    handler.use(apiRequestRoutine());

    handler(demoEvent, <any>{}, () => {});
  });

  it('should return success response', () => {
    const handler = middy(async() => {
      return {foo: 'bar'}
    });
    handler.use(apiRequestRoutine());

    handler(demoEvent, <any>{}, (_, response) => {
      expect(response).toMatchSnapshot();
    })
  });

  it('should return error response if http error is thrown in handler', () => {
    const handler = middy(async() => {
      throw new NotFound('Recourse not found');
    });
    handler.use(apiRequestRoutine());

    handler(demoEvent, <any>{}, (_, response) => {
      expect(response).toMatchSnapshot();
    })
  });

  it('should return error response if internal error is thrown in handler', () => {
    const handler = middy(async() => {
      throw new Error('Some internal error');
    });
    handler.use(apiRequestRoutine());

    // @ts-ignore
    handler(demoEvent, {}, (_, response) => {
      expect(response).toMatchSnapshot();
    })
  });
});
