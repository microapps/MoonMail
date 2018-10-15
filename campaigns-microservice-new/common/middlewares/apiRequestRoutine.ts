import {IHandlerLambda, IMiddyNextFunction} from 'middy';
import {HttpError, ServiceUnavailable} from 'http-errors';

import {AuthorizedEvent, Response} from '../@types';
import {APIGatewayProxyEvent} from "aws-lambda";

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Required for CORS support to work
  'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
};

export const addAuthorizerContext = (event: AuthorizedEvent): void => {
  if (event.requestContext && event.requestContext.authorizer) {
    event.user = event.requestContext.authorizer;
  }
};

export const setDefaultParams = (event: APIGatewayProxyEvent): void => {
  if (event.hasOwnProperty('httpMethod')) {
    event.queryStringParameters = event.queryStringParameters || {};
    event.pathParameters = event.pathParameters || {};
  }
};

export const buildJSONResponse = (response: Response): Response => {
  if (!response) return response;
  if (response.statusCode) return response;
  return {
    statusCode: 200,
    body: JSON.stringify(response),
    headers: DEFAULT_HEADERS
  };
};

export const buildErrorResponse = (error: Error): Response => {
  let httpError: HttpError;
  if (error instanceof HttpError) {
    httpError = error;
  } else {
    httpError = new ServiceUnavailable('Upstream service is unavailable')
  }
  return {
    statusCode: httpError.statusCode,
    body: JSON.stringify({
      status: httpError.name,
      statusCode: httpError.statusCode,
      message: httpError.message
    })
  };
};

export const apiRequestRoutine = () => ({
  before: (handler: IHandlerLambda, next: IMiddyNextFunction) => {
    addAuthorizerContext(handler.event);
    setDefaultParams(handler.event);
    return next();
  },

  after: (handler: IHandlerLambda, next: IMiddyNextFunction) => {
    handler.response = buildJSONResponse(handler.response);
    return next();
  },

  onError: (handler: IHandlerLambda, next: IMiddyNextFunction) => {
    handler.response = buildErrorResponse(handler.error);
    return next();
  }
});
