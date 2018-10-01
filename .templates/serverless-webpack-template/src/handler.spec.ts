import { expect } from 'chai';
import * as sinon from 'sinon';
import handler from './handler';

describe('handler', () => {
  describe('.version', () => {
    it('return the current version', async () => {
      sinon.stub();
      
      expect(await handler({})).to.deep.equal({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Credentials': true
        },
        body: '{"version":"0.0.1"}'
      });
    });
  });
});
