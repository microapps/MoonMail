import { Lambda } from 'aws-sdk';

const lambdaClient = new Lambda({region: process.env.SERVERLESS_REGION});

export default class FunctionsClient {
  static execute(functionName, payload = {}, options = {}) {
    const inovkationType = options.async ? 'Event' : 'RequestResponse';
    const params = {
      Payload: JSON.stringify(payload),
      FunctionName: functionName,
      InvocationType: inovkationType
    };
    return this.client.invoke(params).promise()
      .then(result => this._handleResponse(result))
      .then(payload => this._rejectIfError(payload));
  }

  static _handleResponse(lambdaResult) {
    return this._isSuccess(lambdaResult)
      ? JSON.parse(lambdaResult.Payload)
      : lambdaResult;
  }

  static _isSuccess(lambdaResult) {
    try {
      return JSON.parse(lambdaResult.Payload) && lambdaResult.StatusCode === 200;
    } catch (err) {
      return false;
    }
  }

  static _rejectIfError(payload) {
    if (payload.errorType) return Promise.reject(this._errorFromLambdaFailure(payload));
    return Promise.resolve(payload);
  }

  static _errorFromLambdaFailure(failure) {
    const error = new Error(failure.errorMessage);
    error.stack = failure.stackTrace;
    error.name = failure.errorType;
    return error;
  }

  static get client() {
    return lambdaClient;
  }
}
