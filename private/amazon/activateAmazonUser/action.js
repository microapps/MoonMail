import omitEmpty from 'omit-empty';
import { logger } from '../../lib/index';
import AmazonSubscriptions from '../lib/amazon_subscriptions';
import decrypt from '../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler, newError } from '../../lib/api-utils';
import { User } from '../../lib/models/user';

const customErrors = {
  AlreadyEntitled: newError('AlreadyEntitled', 'This user has already been set up', 409),
  NoEntitlementsLeft: newError('NoEntitlementsLeft', 'This has no more entitlements left', 409)
};

export default function respond(event, cb) {
  logger().info(JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'amazonCustomerId']);
  return checkParams(omitEmpty(event))
    .then(() => decrypt(event.authToken))
    .then(decoded => getCustomerEntitlements({amazonCustomerId: event.amazonCustomerId, userId: decoded.sub}))
    .then(res => entitleUser(res))
    .then(res => cb(null, res))
    .catch(err => {
      logger().error(err);
      return errorHandler(err, {customErrors}, cb);
    });
}

function getCustomerEntitlements({amazonCustomerId, userId}) {
  return AmazonSubscriptions.getCustomerEntitlements(amazonCustomerId)
    .then(entitlements => Object.assign({}, {amazonCustomerId, userId, entitlements}));
}

function entitleUser({amazonCustomerId, userId, entitlements}) {
  return User.get(userId)
    .then(user => checkElegibility({user, entitlements, amazonCustomerId}))
    .then(() => doEntitleUser({amazonCustomerId, userId, entitlements}));
}

function doEntitleUser({amazonCustomerId, userId, entitlements}) {
  const plan = AmazonSubscriptions.plansMapping[entitlements.Entitlements[0].Dimension || 'basicUser'];
  const params = {amazonCustomerId, amazonSubscriptionActive: true, plan, approved: true};
  return User.update(params, userId);
}

function checkElegibility({user, entitlements, amazonCustomerId}) {
  return checkNotEntitled(user)
    .then(user => checkEntitlementsEnough({entitlements, amazonCustomerId}));
}

function checkNotEntitled(user) {
  return new Promise((resolve, reject) => {
    return (!user.amazonCustomerId && !user.amazonSubscriptionActive)
      ? resolve(user) : reject(new Error('AlreadyEntitled'));
  });
}

function checkEntitlementsEnough({entitlements = {Entitlements: []}, amazonCustomerId}) {
  const totalEntitlements = entitlements.Entitlements.reduce((total, current) => total + parseInt(current.Value.IntegerValue), 0);
  return User.entitled(amazonCustomerId)
    .then(entitledUsers => new Promise((resolve, reject) => {
      return entitledUsers.items.length < totalEntitlements
        ? resolve(entitlements)
        : reject(new Error('NoEntitlementsLeft'));
    }));
}
