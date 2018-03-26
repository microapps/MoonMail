import 'babel-polyfill';
import { Lambda } from 'aws-sdk';

const lambdaClient = new Lambda({ region: process.env.SERVERLESS_REGION });

export default class FunctionsClient {
  static execute(functionName, payload = {}, options = {}) {
    const inovkationType = options.async ? 'Event' : 'RequestResponse';
    const params = {
      Payload: JSON.stringify(payload),
      FunctionName: functionName,
      InvocationType: inovkationType
    };
    return this.client().invoke(params).promise()
      .then(result => this._handleResponse(result));
  }

  static _handleResponse(lambdaResult) {
    return this._successfulAWSCall(lambdaResult) ?
      this._parseResults(lambdaResult) : Promise.reject(lambdaResult);
  }

  static _parseResults(lambdaResult) {
    if (this._successfulFunctionResult(lambdaResult)) {
      return Promise.resolve(JSON.parse(lambdaResult.Payload));
    }
    const err = this._parseFunctionError(lambdaResult.Payload);
    return Promise.reject(err);
  }

  static _parseFunctionError(payload) {
    const parsedPayload = JSON.parse(payload);
    try {
      return JSON.parse(parsedPayload.errorMessage);
    } catch (e) {
      return parsedPayload;
    }
  }

  static _successfulFunctionResult(lambdaResult) {
    return !lambdaResult.FunctionError;
  }

  static _successfulAWSCall(lambdaResult) {
    const validStatusCodes = [200, 202];
    return validStatusCodes.includes(lambdaResult.StatusCode);
  }

  static client() {
    return lambdaClient;
  }
}
