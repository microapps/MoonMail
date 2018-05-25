import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { createAssocAndStoreAffiliates } from './createAffiliates';
import { User } from '../../../lib/models/user';

const expect = chai.expect;
chai.use(sinonChai);

describe('createAssocAndStoreAffiliates', () => {
  let tapfiliateApi;
  const userEmail = 'user@example.com';
  const userId = 'user-id';
  const affiliateId = 'someid';
  const user = { email: userEmail, id: userId };
  const userWithffiliateId = { email: userEmail, id: userId, affiliateId };
  const referralLink = 'https://yoursite.com/?tap_a=1-123&tap_s=2-abc';

  context('when the user dont have affiliate id', () => {
    before(() => {
      process.env.TAPFILLIATE_DEFAULT_PROGRAM_ID = '123';
      tapfiliateApi = nock('https://tapfiliate.com');
      tapfiliateApi
        .post('/api/1.5/affiliates/', JSON.stringify({
          firstname: userEmail,
          lastname: ' ',
          email: userEmail,
          meta_data: { mmUserId: userId }
        }))
        .reply(201, {
          id: affiliateId
        });

      tapfiliateApi
        .post(`/api/1.5/programs/${process.env.TAPFILLIATE_DEFAULT_PROGRAM_ID}/affiliates/`, JSON.stringify({
          affiliate: {
            id: affiliateId
          },
          approved: true
        }))
        .reply(201, {
          referral_link: {
            link: referralLink,
            asset_id: '1-123',
            source_id: '2-abc'
          }
        });

      sinon.stub(User, 'update').resolves({});
    });

    after(() => {
      nock.cleanAll();
      User.update.restore();
    });

    it('creates affiliates, associates a program and update user accordingly', (done) => {
      createAssocAndStoreAffiliates([user]).then((result) => {
        expect(result).to.exist;
        expect(tapfiliateApi.isDone()).to.be.true;
        expect(User.update).to.be.called;
        expect(User.update).to.have.been.calledWithExactly({ affiliateId, referralLink }, userId);
        done();
      }).catch(error => done(error));
    });
  });
});
