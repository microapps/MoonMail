import Promise from 'bluebird';
import request from 'request-promise';
import { strip } from 'eskimo-stripper';
import { User } from '../../../lib/models/user';
import { debug } from '../../../lib/index';

export default function createAffiliates(event) {
  // Workaround to avoid creating affiliates from the dev env.
  if (process.env.SERVERLESS_STAGE === 'dev') return Promise.resolve({});
  //
  const validAffiliateCandidates = event.Records
    .filter(record => record.eventName === 'INSERT' || record.eventName === 'MODIFY')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(user => notAffiliate(user));

  return createAssocAndStoreAffiliates(validAffiliateCandidates)
    .catch(error => skipIfAffiliateAlreadyExists(error));
}

function skipIfAffiliateAlreadyExists(error) {
  if (error.message.match(/The email is already used/)) {
    debug('= createAffiliates, already existing affiliate, skipping', error);
    return Promise.resolve({});
  }
  return Promise.reject(error);
}

function notAffiliate(user) {
  return !!user.email;// && !user.affiliateId;
}

export function createAssocAndStoreAffiliates(users) {
  return Promise.map(users,
    user => createAssocAndStoreAffiliate(user),
    { concurrency: 2 });
}

function updateUserAffiliateId(userId, affiliateId, referralLink) {
  return User.update({ affiliateId, referralLink }, userId);
}

function createAssocAndStoreAffiliate(user) {
  return createAffiliate(user)
    .then(affiliate => assocToProgram(affiliate))
    .then(affiliateWithReferralData => updateUserAffiliateId(user.id, affiliateWithReferralData.id, affiliateWithReferralData.referral_link.link));
}

function buildFirstName(user) {
  return user.firstName ? user.firstName : user.email;
}

function buildLastName(user) {
  return user.firstName ? user.firstName : ' ';
}

function createAffiliate(user) {
  const params = {
    method: 'POST',
    uri: 'https://tapfiliate.com/api/1.5/affiliates/',
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    body: {
      firstname: buildFirstName(user),
      lastname: buildLastName(user),
      email: user.email,
      meta_data: { mmUserId: user.id }
    }
  };
  return request(params);
}


export function assocToProgram(affiliate) {
  const params = {
    method: 'POST',
    uri: `https://tapfiliate.com/api/1.5/programs/${process.env.TAPFILLIATE_DEFAULT_PROGRAM_ID}/affiliates/`,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    body: {
      affiliate: {
        id: affiliate.id
      },
      approved: true
    }
  };
  return request(params)
    .then(assocResult => Object.assign({}, assocResult, affiliate));
}

