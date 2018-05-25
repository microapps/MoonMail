import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { User } from './models/user';
import UninstallExtensionService from './uninstall_extension_service';
import Extensions from './extensions';
import CancelStripeSubscription from './cancel_stripe_subscription';
import FetchStripeSubscription from './fetch_stripe_subscription';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('UninstallExtensionService', () => {
  const installedExtensionIds = ['file-attachment', 'zapier', 'ip-address'];
  const user = {id: 'user-id', installedExtensionIds};

  before(() => {
    sinon.stub(User, 'get').resolves(user);
  });

  after(() => {
    User.get.restore();
  });

  describe('.execute()', () => {
    context('when the extension is not installed', () => {
      it('should return an ExtensionNotInstalled error', done => {
        const promise = UninstallExtensionService.execute({
          userId: user.id,
          extensionId: 'non-installed-extension'
        });
        expect(promise).to.be.rejectedWith('ExtensionNotInstalled').notify(done);
      });
    });

    context('when the extension needs subscription', () => {
      const extensionId = 'file-attachment';
      const noSubscriptionExtensionId = 'ip-address';
      const stripePlan = 'extension-stripe-plan';
      const stripePlanWithoutSubscription = 'no-subs-stripe-plan';
      const subscriptionId = 'subscription-id';

      beforeEach(() => {
        sinon.stub(Extensions, 'getStripePlanId')
          .withArgs(extensionId).returns(stripePlan)
          .withArgs(noSubscriptionExtensionId).returns(stripePlanWithoutSubscription);
        sinon.stub(FetchStripeSubscription, 'execute')
          .withArgs(user, stripePlan).resolves({id: subscriptionId})
          .withArgs(user, stripePlanWithoutSubscription).rejects(new Error('SubscriptionNotFound'));
      });
      afterEach(() => {
        FetchStripeSubscription.execute.restore();
        Extensions.getStripePlanId.restore();
      });

      context('and it does not exist', () => {
        it('should return a SubscriptionNotFound error', done => {
          const promise = UninstallExtensionService.execute({userId: user.id, extensionId: noSubscriptionExtensionId});
          expect(promise).to.be.rejectedWith('SubscriptionNotFound').notify(done);
        });
      });

      context('and Stripe fails', () => {
        const stripeError = new Error('StripeError');
        beforeEach(() => {
          sinon.stub(CancelStripeSubscription, 'execute').rejects(stripeError);
          sinon.spy(User, 'update');
        });
        afterEach(() => {
          CancelStripeSubscription.execute.restore();
          User.update.restore();
        });

        it('should return Stripe\'s error', done => {
          const promise = UninstallExtensionService.execute({
            userId: user.id, extensionId
          });
          expect(promise).to.be.rejectedWith(stripeError).notify(done);
        });

        it('should not add the extension to the array', async () => {
          try {
            await UninstallExtensionService.execute({
              userId: user.id, extensionId
            });
          } catch (err) {
            expect(User.update).not.to.have.been.called;
          }
        });
      });

      context('and everything goes fine', () => {
        beforeEach(() => {
          sinon.stub(CancelStripeSubscription, 'execute')
            .withArgs(subscriptionId).resolves({ok: true});
          sinon.stub(User, 'update').resolves(user);
        });
        afterEach(() => {
          CancelStripeSubscription.execute.restore();
          User.update.restore();
        });

        it('should cancel the Stripe subscription for the extension', async () => {
          await UninstallExtensionService.execute({userId: user.id, extensionId});
          expect(CancelStripeSubscription.execute).to.have.been.calledWithExactly(subscriptionId);
        });

        it('should remove the extension from the user installed extensions', async () => {
          await UninstallExtensionService.execute({userId: user.id, extensionId});
          const expectedExtensionIds = user.installedExtensionIds
            .filter(eid => eid !== extensionId);
          const expectedParams = [{installedExtensionIds: expectedExtensionIds}, user.id];
          expect(User.update).to.have.been.calledWithExactly(...expectedParams);
        });
      });
    });

    context('when the extension is free', () => {
      const extensionId = 'zapier';
      const service = new UninstallExtensionService({userId: user.id, extensionId});

      beforeEach(() => {
        sinon.spy(service, '_doCancel');
        sinon.stub(User, 'update').resolves(user);
      });
      afterEach(() => {
        service._doCancel.restore();
        User.update.restore();
      });

      it('should remove the extension from the user installed extensions', async () => {
        await service.execute();
        const expectedExtensionIds = user.installedExtensionIds
          .filter(eid => eid !== extensionId);
        const expectedParams = [{installedExtensionIds: expectedExtensionIds}, user.id];
        expect(User.update).to.have.been.calledWithExactly(...expectedParams);
      });

      it('should not cancel any subscription', async () => {
        await service.execute();
        expect(service._doCancel).not.to.have.been.called;
      });
    });
  });
});
