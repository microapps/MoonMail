import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';
import AWS from 'aws-sdk'
import { List } from 'moonmail-models';
import { respond } from './action';
import { ConfirmSubscriptionService } from '../lib/confirm_subscription_service';
import EventsBus from '../../../lib/events_bus';

const expect = chai.expect;
chai.use(sinonChai);
const successKinesis = function () {
  return {
    putRecord: (params) => {
      return {
        promise: async () => 'data'
      }
    }
  }
}

describe('confirmSubscription', () => {
  const successPage = 'https://success.com';
  const errorPage = 'https://error.com';
  process.env.SUCCESS_PAGE = successPage;
  process.env.ERROR_PAGE = errorPage;
  process.env.SERVERLESS_REGION = 'REGION';
  const serviceStub = sinon.createStubInstance(ConfirmSubscriptionService);
  const customRedirectList = {
    name: 'MyList',
    successConfirmationUrl: 'https://custom-success.com',
    errorConfirmationUrl: 'https://custom-error.com'
  };

  before(() => sinon.stub(List, 'get')
    .withArgs(sinon.match.string, 'custom-list-id').resolves(customRedirectList)
    .withArgs(sinon.match.any)
    .resolves({ name: 'MyList' })
  );
  after(() => List.get.restore());

  describe('#respond()', () => {
    context('when the event contains all the required params', () => {
      const event = { listId: 'list-id', recipientId: 'recipient-id', verificationCode: 'code', encodedUserId: 'foo' };
      const recipient = { id: 'recipient-id', listId: 'list-id' };
      AWS.Kinesis = successKinesis
      context('and the subscribe service call was sucessful', () => {
        beforeEach(() => {
          serviceStub.subscribe.resolves(recipient);
          sinon.stub(ConfirmSubscriptionService, 'create').returns(serviceStub);
          sinon.stub(EventsBus, 'publish').resolves(true);
        });
        afterEach(() => {
          EventsBus.publish.restore();
          ConfirmSubscriptionService.create.restore();
        });

        it('should redirect to the success page', (done) => {
          respond(event, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.have.property('url', `${successPage}/?listName=MyList`);
            done();
          });
        });

        it('should publish a notification to the bus', (done) => {
          respond(event, (err) => {
            expect(err).not.to.exist;
            const eventType = 'list.recipient.subscribe';
            const payload = { recipient };
            expect(EventsBus.publish).to.have.been.calledWithExactly(eventType, payload);
            done();
          });
        });

        context('and the list has custom redirect', () => {
          it('should redirect to the custom success page', (done) => {
            const evt = Object.assign({}, event, { listId: 'custom-list-id' });
            respond(evt, (err, result) => {
              expect(err).to.not.exist;
              expect(result).to.have.property('url', `${customRedirectList.successConfirmationUrl}/?listName=MyList`);
              done();
            });
          });
        });
      });

      context('and the subscribe service call was unsucessful', () => {
        before(() => {
          serviceStub.subscribe.rejects({});
          sinon.stub(ConfirmSubscriptionService, 'create').returns(serviceStub);
        });
        after(() => ConfirmSubscriptionService.create.restore());

        it('should redirect to the error page', (done) => {
          respond(event, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.have.property('url', `${errorPage}/?listName=MyList`);
            done();
          });
        });

        context('and the list has custom redirect', () => {
          it('should redirect to the custom error page', (done) => {
            const evt = Object.assign({}, event, { listId: 'custom-list-id' });
            respond(evt, (err, result) => {
              expect(err).to.not.exist;
              expect(result).to.have.property('url', `${customRedirectList.errorConfirmationUrl}/?listName=MyList`);
              done();
            });
          });
        });
      });
    });

    context('when the event does not contain all the params', () => {
      const event = {};
      it('should redirect to the error page', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.have.property('url', errorPage);
          done();
        });
      });

      context('and the list has custom redirect', () => {
        it('should redirect to the custom error page', (done) => {
          const evt = Object.assign({}, event, { listId: 'custom-list-id', encodedUserId: 'foo' });
          respond(evt, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.have.property('url', `${customRedirectList.errorConfirmationUrl}/?listName=MyList`);
            done();
          });
        });
      });
    });
  });
});
