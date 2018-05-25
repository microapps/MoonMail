import * as chai from 'chai';
import * as sinon from 'sinon';
import { Report } from 'moonmail-models';
import 'sinon-as-promised';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { User } from './user';
import { NonExistingSender, SenderAlreadyExists } from '../errors';


const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('User', () => {
  const sandbox = sinon.sandbox.create();
  const tableName = 'Users-table';
  const userId = 'userId';
  let tNameStub;
  const userHashKey = 'id';
  const senderId = 'senderId';
  const emailAddress = 'some@email.com';
  const nonExistingEmail = 'another@email.com';
  const ses = { apiKey: 'key', apiSecret: 'secret', region: 'us-east-1' };
  const sender = { id: senderId, emailAddress, verified: true };
  const user = { id: userId, senders: [sender], ses };

  before(() => {
    sandbox.stub(User, '_client').resolves(true);
    // tNameStub = sandbox.stub(User, 'tableName', { get: () => tableName });
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      User.get(userId).then(() => {
        const args = User._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${userHashKey}`, userId);
        // expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(User.hashKey).to.equal(userHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(User.rangeKey).to.be.null;
    });
  });

  describe('#listSenders()', () => {
    before(() => {
      sandbox.stub(User, 'get').resolves(user);
    });

    it('resolves the user\'s senders', (done) => {
      const expectedSenders = { items: user.senders };
      User.listSenders(userId)
        .then((senders) => {
          expect(senders).to.deep.equal(expectedSenders);
          done();
        });
    });

    after(() => User.get.restore());
  });

  describe('#fetchSender()', () => {
    before(() => sandbox.stub(User, 'get').resolves(user));

    context('when the sender exists', () => {
      it('resolves the sender', (done) => {
        User.fetchSender(userId, senderId).then((fetchedSender) => {
          const expectedSender = Object.assign({}, sender, ses);
          expect(fetchedSender).to.deep.equal(expectedSender);
          done();
        }).catch(err => done(err));
      });
    });

    context('when the sender does not exist', () => {
      it('rejects the promise', (done) => {
        const fetchPromise = User.fetchSender(userId, 'no-sender');
        expect(fetchPromise).to.eventually.be.rejectedWith(NonExistingSender).notify(done);
      });
    });

    after(() => User.get.restore());
  });

  describe('#createSender()', () => {
    beforeEach(() => {
      sandbox.stub(User, 'get').resolves(user);
      sandbox.stub(User, 'update').resolves(sender);
    });

    context('when the sender exists', () => {
      it('rejects the promise', (done) => {
        User.createSender(userId, emailAddress).catch((err) => {
          expect(User.update).not.to.have.been.called;
          expect(err).to.be.an.instanceOf(SenderAlreadyExists);
          done();
        });
      });
    });

    context('when the sender does not exist', () => {
      it('updates the senders list', (done) => {
        User.createSender(userId, nonExistingEmail).then((newSender) => {
          const [updateArgs, hashKey, rangeKey] = User.update.lastCall.args;
          expect(hashKey).to.equal(userId);
          expect(rangeKey).not.to.exist;
          expect(updateArgs).to.have.property('senders');
          expect(updateArgs.senders).to.include(sender);
          const expectedSender = {
            emailAddress: nonExistingEmail,
            verified: false
          };
          const newSenderArgs = updateArgs.senders.find(s => s.emailAddress === nonExistingEmail);
          expect(newSenderArgs).to.deep.contain(expectedSender);
          expect(newSender).to.deep.contain(expectedSender);
          done();
        });
      });
    });

    afterEach(() => {
      User.get.restore();
      User.update.restore();
    });
  });

  describe('#updateSender', () => {
    const oldSender = { id: 'sender-id', emailAddress: 'foo@bar.com', fromName: 'Foo', verified: false };
    const newSender = { id: 'sender-id', emailAddress: 'foo@bar.com', fromName: 'New Foo', verified: true };
    const anotherSender = { id: 'another-sender-id', emailAddress: 'bar@bar.com', fromName: 'Bar', verified: true };
    const nonExistingSender = { id: 'non-existing-id' };
    const senders = [oldSender, anotherSender];
    const newSenders = [newSender, anotherSender];
    const someUser = { id: userId, senders };

    beforeEach(() => {
      sandbox.stub(User, 'get').resolves(someUser);
      sandbox.stub(User, 'update').resolves({ id: userId, senders: newSenders });
    });

    context('when the sender exists', () => {
      it('should update and return the new sender', (done) => {
        User.updateSender(userId, newSender).then((updatedSender) => {
          const [updateArgs, hashKey, rangeKey] = User.update.lastCall.args;
          const sendersArg = updateArgs.senders;
          expect(sendersArg).to.include(newSender).and.to.include(anotherSender);
          expect(sendersArg).not.to.include(oldSender);
          expect(updatedSender).to.deep.equal(newSender);
          done();
        })
          .catch(done);
      });
    });

    context('when the sender does not exist', () => {
      it('should reject the promise', (done) => {
        User.updateSender(userId, nonExistingSender).catch((err) => {
          expect(User.update).not.to.have.been.called;
          expect(err).to.be.an.instanceOf(NonExistingSender);
          done();
        });
      });
    });

    afterEach(() => {
      User.get.restore();
      User.update.restore();
    });
  });

  describe('#deleteSender', () => {
    const aSenderId = 'a-sender-id';
    const aSender = { id: aSenderId, emailAddress: 'foo@bar.com', fromName: 'Foo', verified: false };
    const anotherSenderId = 'another-sender-id';
    const anotherSender = { id: anotherSenderId, emailAddress: 'bar@bar.com', fromName: 'Bar', verified: true };
    const nonExistingSender = { id: 'non-existing-id' };
    const senders = [aSender, anotherSender];
    const someUser = { id: userId, senders };

    beforeEach(() => {
      sandbox.stub(User, 'get').resolves(someUser);
      sandbox.stub(User, 'update').resolves({ id: userId, senders: [anotherSender] });
    });

    context('when the sender exists', () => {
      context('and is not verified', () => {
        it('should update and return the senders', (done) => {
          User.deleteSender(userId, aSenderId).then(() => {
            const [updateArgs, hashKey, rangeKey] = User.update.lastCall.args;
            const sendersArg = updateArgs.senders;
            expect(sendersArg).to.include(anotherSender).and.not.to.include(aSender);
            done();
          }).catch(done);
        });
      });

      context('and it\'s verified', () => {
        it('should reject the promise', (done) => {
          User.deleteSender(userId, anotherSenderId).catch((err) => {
            expect(err).to.equal('Sender cannot be deleted');
            done();
          });
        });
      });
    });

    context('when the sender does not exist', () => {
      it('should reject the promise', (done) => {
        User.deleteSender(userId, nonExistingSender).catch((err) => {
          expect(User.update).not.to.have.been.called;
          expect(err).to.equal('Sender cannot be deleted');
          done();
        });
      });
    });

    afterEach(() => {
      User.get.restore();
      User.update.restore();
    });
  });

  describe('#isInSandbox', () => {
    const report = { sentCount: 25, bouncesCount: 10, complaintsCount: 5 };

    context('when he sent enough emails', () => {
      beforeEach(() => sandbox.stub(Report, 'allByUser').resolves(report));
      afterEach(() => Report.allByUser.restore());

      it('should return false', (done) => {
        User.isInSandbox(userId).then((result) => {
          expect(result).to.be.falsey;
          done();
        }).catch(done);
      });
    });

    context('when he did not send enough emails', () => {
      const report = { sentCount: 24, bouncesCount: 10, complaintsCount: 5 };
      beforeEach(() => sandbox.stub(Report, 'allByUser').resolves(report));
      afterEach(() => Report.allByUser.restore());

      it('should return true', (done) => {
        User.isInSandbox(userId).then((result) => {
          expect(Report.allByUser).to.have.been.calledOnce;
          expect(result).to.be.truthy;
          done();
        });
      });
    });
  });

  describe('#updatePlan', () => {
    beforeEach(() => sandbox.stub(User, 'update').resolves({ id: userId, plan: 'newplan' }));
    context('when the MoonMail plan was provided', () => {
      it('should update user plan', (done) => {
        const moonmailPlan = 'paid';
        User.updatePlan(userId, moonmailPlan).then(() => {
          expect(User.update).to.have.been.calledWith({ plan: moonmailPlan }, userId);
          done();
        }).catch(done);
      });
    });

    afterEach(() => User.update.restore());
  });

  describe('#entitled', () => {
    const entitledUsers = { items: [{ id: 'user1' }, { id: 'user2' }] };
    const amazonIndex = 'amazon-index';
    beforeEach(() => {
      process.env.AMAZON_CUSTOMER_INDEX = amazonIndex;
      sandbox.stub(User, 'allBy').resolves(entitledUsers);
    });
    afterEach(() => {
      delete process.env.AMAZON_CUSTOMER_INDEX;
      User.allBy.restore();
    });

    it('should update user plan', async () => {
      const amazonCustomerId = 'customer-id';
      const result = await User.entitled(amazonCustomerId);
      const expectedAllByParams = ['amazonCustomerId', amazonCustomerId, { indexName: amazonIndex }];
      expect(User.allBy).to.have.been.calledWithExactly(...expectedAllByParams);
      expect(result).to.deep.equal(entitledUsers);
    });
  });

  after(() => {
    User._client.restore();
    // tNameStub.restore();
  });
});
