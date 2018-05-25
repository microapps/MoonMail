import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { User } from './models/user';
import InstallExtensionService from './install_extension_service';
import Extensions from './extensions';
import CreateStripeSubscription from './create_stripe_subscription';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('InstallExtensionService', () => {
  const user = {
    id: 'user-id',
    installedExtensionIds: ['file-attachment']
  };

  before(() => sinon.stub(User, 'get').resolves(user));
  after(() => User.get.restore());

  describe('.execute()', () => {
    context('when the extension is already installed', () => {
      it('should return an ExtensionAlreadyInstalled error', done => {
        const promise = InstallExtensionService.execute({
          userId: user.id,
          extensionId: user.installedExtensionIds[0]
        });
        expect(promise).to.be.rejectedWith('ExtensionAlreadyInstalled').notify(done);
      });
    });

    context('when the extension ID does not exist', () => {
      before(() => sinon.stub(Extensions, 'get').returns(undefined));
      after(() => Extensions.get.restore());

      it('should return an ExtensionDoesNotExist error', done => {
        const promise = InstallExtensionService.execute({
          userId: user.id,
          extensionId: 'new-extension'
        });
        expect(promise).to.be.rejectedWith('ExtensionDoesNotExist').notify(done);
      });
    });

    context('when the extension needs subscription', () => {
      context('and Stripe fails', () => {
        const stripeError = new Error('StripeError');
        beforeEach(() => {
          sinon.stub(CreateStripeSubscription, 'execute').rejects(stripeError);
          sinon.spy(User, 'update');
        });
        afterEach(() => {
          CreateStripeSubscription.execute.restore();
          User.update.restore();
        });

        it('should return Stripe\'s error', done => {
          const promise = InstallExtensionService.execute({
            userId: user.id,
            extensionId: 'ip-address'
          });
          expect(promise).to.be.rejectedWith(stripeError).notify(done);
        });

        it('should not add the extension to the array', async () => {
          try {
            await InstallExtensionService.execute({
              userId: user.id,
              extensionId: 'ip-address'
            });
          } catch (err) {
            expect(User.update).not.to.have.been.called;
          }
        });
      });

      context('and everything goes fine', () => {
        const extensionId = 'ip-address';
        const stripePlan = 'extension-stripe-plan';

        beforeEach(() => {
          sinon.stub(CreateStripeSubscription, 'execute').resolves({id: 'subs'});
          sinon.stub(User, 'update').resolves(user);
          sinon.stub(Extensions, 'getStripePlanId').returns(stripePlan);
        });
        afterEach(() => {
          CreateStripeSubscription.execute.restore();
          User.update.restore();
          Extensions.getStripePlanId.restore();
        });

        it('should create a Stripe subscription for the extension', async () => {
          await InstallExtensionService.execute({userId: user.id, extensionId});
          expect(CreateStripeSubscription.execute).to.have.been.calledWithExactly(user.id, stripePlan);
        });

        it('should add the extension to the user installed extensions', async () => {
          await InstallExtensionService.execute({userId: user.id, extensionId});
          const expectedExtensionIds = user.installedExtensionIds.concat(extensionId);
          const expectedParams = [{installedExtensionIds: expectedExtensionIds}, user.id];
          expect(User.update).to.have.been.calledWithExactly(...expectedParams);
        });
      });
    });

    context('when the extension is free', () => {
      const extensionId = 'zapier';
      const service = new InstallExtensionService({userId: user.id, extensionId});

      beforeEach(() => {
        sinon.spy(service, '_doCharge');
        sinon.stub(User, 'update').resolves(user);
      });
      afterEach(() => {
        service._doCharge.restore();
        User.update.restore();
      });

      it('should add the extension to the user installed extensions', async () => {
        await service.execute();
        const expectedExtensionIds = user.installedExtensionIds.concat(extensionId);
        const expectedParams = [{installedExtensionIds: expectedExtensionIds}, user.id];
        expect(User.update).to.have.been.calledWithExactly(...expectedParams);
      });

      it('should not perform any payment', async () => {
        await service.execute();
        expect(service._doCharge).not.to.have.been.called;
      });
    });
  });
});
