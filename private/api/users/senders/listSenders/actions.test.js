import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { User } from '../../../../lib/models/user';

const expect = chai.expect;

describe('listSenders', () => {
  let event;
  const user = { id: 'user-id' };
  const allSenders = [{ name: 'sender1', archived: true }, { name: 'sender2', archived: false }];
  const sendersArchived = [{ name: 'sender1', archived: true }];
  const sendersNotArchived = [{ name: 'sender2', archived: false }];

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid and it has a "true" filter', () => {
      before(() => {
        event = { senderId: 'sender-id', filters: { archived: 'true' } };
        sinon.stub(User, 'listSenders').resolves({ items: allSenders });
      });
      after(() => {
        User.listSenders.restore();
      });
      it('should return archived senders', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.deep.equal({ items: sendersArchived });
          done();
        });
      });
    });

    context('when the event is valid and it has a "false" filter', () => {
      before(() => {
        event = { senderId: 'sender-id', filters: { archived: 'false' } };
        sinon.stub(User, 'listSenders').resolves({ items: allSenders });
      });
      after(() => {
        User.listSenders.restore();
      });
      it('should not return archived senders', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.deep.equal({ items: sendersNotArchived });
          done();
        });
      });
    });

    context('when the event is valid but it has no filter', () => {
      before(() => {
        event = { senderId: 'sender-id', filters: { } };
        sinon.stub(User, 'listSenders').resolves({ items: allSenders });
      });
      after(() => {
        User.listSenders.restore();
      });
      it('should return both senders', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.deep.equal({ items: allSenders });
          done();
        });
      });
    });

    after(() => {
      decrypt.default.restore();
    });
  });
});
