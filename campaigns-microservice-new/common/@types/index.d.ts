import {APIGatewayEventRequestContext, APIGatewayProxyEvent} from 'aws-lambda';

export type TokenPayload = {
  aud: string;
  email: string;
  email_verified: boolean;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  [key: string]: any;
};

export type AuthorizerContext = {
  userId: string;
  principalId: string;
  email?: string;
};

export interface AuthorizedEventRequestContext extends APIGatewayEventRequestContext {
  authorizer: AuthorizerContext;
}

export interface AuthorizedEvent extends APIGatewayProxyEvent {
  user?: AuthorizerContext;
  requestContext: AuthorizedEventRequestContext;
}

export interface NormalizedEvent {
  user: AuthorizerContext;
  headers: {[name: string]: string};
  httpMethod: string;
  isBase64Encoded: boolean;
  path: string;
  pathParameters: {
    [name: string]: string,
    fields: Array<string>
  } | null;
  queryStringParameters: {
    [name: string]: string|number|Array<string>,
    page: number,
    limit: number,
    fields: Array<string>,
    archived: boolean
  } | null,
  stageVariables: {[name: string]: string} | null;
  requestContext: APIGatewayEventRequestContext;
  resource: string;
  body: object;
}

export type Auth0UserData = {
  user_id: string;
  email_verified: boolean;
  email: string;
  picture: string;
  nickname: string;
  user_metadata: {[name: string]: any};
  app_metadata: {[name: string]: any};
};

export type Response = {
  statusCode?: number
  [key: string]: any
}