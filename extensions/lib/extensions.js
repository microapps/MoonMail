import 'babel-polyfill';
import * as extensionsJson from './extensions.json';

const extensions = extensionsJson.extensions;
const stripePlansMapping = {
  'file-attachment': process.env.STRIPE_FILE_ATTACHMENT_PLAN,
  'ip-address': process.env.STRIPE_IP_ADDRESS_PLAN,
  'download-clean-list': process.env.STRIPE_DOWNLOAD_CLEAN_LIST_PLAN,
  'rss-to-email': process.env.STRIPE_RSS_TO_EMAIL_PLAN
};

const MoonMailExtensions = {
  getStripePlanId(extensionId) {
    return stripePlansMapping[extensionId];
  },
  get(extensionId) {
    return extensions.find(e => e.id === extensionId);
  }
};

export default MoonMailExtensions;
