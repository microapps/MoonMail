import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import FunctionsClient from './functions_client';

const expect = chai.expect;
chai.use(sinonChai);

describe('FunctionsClient', () => {
  describe('.execute', () => {
    let lambdaStub;
    let clientGetterStub;
    const functionName = 'my-function';
    const lambdaResponse = {
      StatusCode: 200,
      Payload: '{"the": "response"}'
    };

    beforeEach(() => {
      awsMock.mock('Lambda', 'invoke', lambdaResponse);
      lambdaStub = new AWS.Lambda();
      clientGetterStub = sinon.stub(FunctionsClient, 'client', {get: () => lambdaStub});
    });
    afterEach(() => {
      awsMock.restore('Lambda');
      clientGetterStub.restore();
    });

    it('should execute the provided function', async () => {
      const payload = {my: 'payload'};
      const result = await FunctionsClient.execute(functionName, payload);
      const expected = {
        FunctionName: functionName,
        Payload: JSON.stringify(payload),
        InvocationType: 'RequestResponse'
      };
      expect(lambdaStub.invoke).to.have.been.calledWith(expected);
      expect(result).to.deep.equal(JSON.parse(lambdaResponse.Payload));
    });

    context('when the async option is provided', () => {
      it('should execute the function asynchronously', async () => {
        const payload = {my: 'payload'};
        await FunctionsClient.execute(functionName, payload, {async: true});
        const expected = {
          FunctionName: functionName,
          Payload: JSON.stringify(payload),
          InvocationType: 'Event'
        };
        expect(lambdaStub.invoke).to.have.been.calledWith(expected);
      });
    });
  });
});
