import { Link } from 'moonmail-models';
import { logger } from './index';
import { LinksParser } from './links_parser';
import { compressString, uncompressString } from './utils';

class ParseLinksService {

  constructor(snsClient, campaignParams) {
    this.campaignParams = campaignParams;
    const uncompressedBody = uncompressString(campaignParams.campaign.body);
    this.campaignParams.campaign.body = uncompressedBody;
    this.parsedBody = null;
    this.apiHost = process.env.API_HOST;
    this.clicksHost = process.env.CLICKS_HOST;
    this.sendCampaignTopicArn = process.env.ATTACH_RECIPIENTS_TOPIC_ARN;
    this.snsClient = snsClient;
  }

  precompile() {
    logger().debug('= ParseLinksService.precompile', 'Starting precompilation process');
    return this.addTracking()
      .then((result) => {
        return new Promise((resolve, reject) => {
          this.saveLinks(result.campaignLinks)
            .then(() => resolve(result.parsedBody))
            .catch(reject);
        });
      })
      .then((parsedBody) => this.composeCanonicalMessage(parsedBody))
      .then((canonicalMessage) => this.publishToSns(canonicalMessage));
  }

  addTracking() {
    logger().debug('= ParseLinksService.addTracking', 'Adding tracking to body');
    const linksParser = new LinksParser({
      campaignId: this.campaignParams.campaign.id,
      apiHost: this.apiHost,
      clicksHost: this.clicksHost
    });
    return linksParser.parseLinks(this.campaignParams.campaign.body);
  }

  saveLinks(campaignLinks) {
    logger().debug('= ParseLinksService.saveLinks', 'Saving links');
    return Link.save(campaignLinks);
  }

  composeCanonicalMessage(parsedBody) {
    return new Promise((resolve) => {
      let canonicalMessage = Object.assign({}, this.campaignParams);
      const compressedParsedBody = compressString(parsedBody);
      Object.assign(canonicalMessage.campaign, {body: compressedParsedBody, precompiled: true});
      resolve(canonicalMessage);
    });
  }

  publishToSns(canonicalMessage) {
    return new Promise((resolve, reject) => {
      logger().info('= ParseLinksService.publishToSns', 'Sending canonical message', JSON.stringify(canonicalMessage));
      const params = {
        Message: JSON.stringify(canonicalMessage),
        TopicArn: this.sendCampaignTopicArn
      };
      this.snsClient.publish(params, (err, data) => {
        if (err) {
          logger().debug('= ParseLinksService.publishToSns', 'Error sending message', err);
          reject(err);
        } else {
          logger().debug('= ParseLinksService.publishToSns', 'Message sent');
          resolve(data);
        }
      });
    });
  }
}

module.exports.ParseLinksService = ParseLinksService;
