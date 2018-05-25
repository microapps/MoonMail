import aws from 'aws-sdk';

const awsConfig = {
  region: process.env.AWS_MARKETPLACE_REGION,
  accessKeyId: process.env.AWS_MARKETPLACE_API_KEY,
  secretAccessKey: process.env.AWS_MARKETPLACE_API_SECRET
};

const awsMarketplaceProductCode = process.env.AWS_MARKETPLACE_PRODUCT_CODE;

const plansMapping = {
  basicUser: 'aws_saas_marketplace_basic',
  proUser: 'aws_saas_marketplace_pro'
};

function awsMarketplaceClient(config = awsConfig, service = 'MarketplaceEntitlementService') {
  return new Promise((resolve, reject) => {
    return aws[service]
      ? resolve(new aws[service](config))
      : reject(new Error('NonExistingService'));
  });
}

function resolveCustomer(token) {
  return awsMarketplaceClient(awsConfig, 'MarketplaceMetering')
    .then(marketplaceClient => marketplaceClient.resolveCustomer({RegistrationToken: token}).promise());
}

function getEntitlements({productCode = awsMarketplaceProductCode, options = {}}) {
  const params = Object.assign({}, options, {ProductCode: productCode});
  return awsMarketplaceClient(awsConfig)
    .then(marketplaceClient => marketplaceClient.getEntitlements(params).promise());
}

function getCustomerEntitlements(customerId) {
  const options = {Filter: {CUSTOMER_IDENTIFIER: [customerId]}};
  return getEntitlements({options});
}


export default {
  resolveCustomer,
  getCustomerEntitlements,
  plansMapping
};
