import * as chai from 'chai';
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FetchPaidSenderInformationService } from './fetch_paid_sender_information_service';
import { User } from '../models/user';
require('sinon-as-promised');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('FetchPaidSenderInformationService', () => {
  let fetchPaidSenderInformationService;
  const userId = 'user-id';
  const senderId = 'sender-id';

  before(() => {
    fetchPaidSenderInformationService = new FetchPaidSenderInformationService(userId, senderId);
    sinon.stub(User, 'fetchSender').resolves({});
  });

  describe('#getData()', () => {
    it('gets the correct sender from DB', (done) => {
      fetchPaidSenderInformationService.getData().then(() => {
        expect(User.fetchSender).to.have.been.calledWithExactly(userId, senderId);
        done();
      });
    });
  });

  after(() => User.fetchSender.restore());
});
