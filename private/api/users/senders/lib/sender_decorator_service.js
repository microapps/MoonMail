import Promise from 'bluebird';
import { debug } from '../../../../lib/index';
import { GetDkimStatusService } from './get_dkim_status_service';
import { GetSpfStatusService } from './get_spf_status_service';
import { GetDmarcStatusService } from './get_dmarc_status_service';
import { GetDomainVerificationStatusService } from './get_domain_verification_status_service';
import { GenerateDomainVerificationTokensService } from './generate_domain_verification_tokens_service';
import { GenerateDkimTokensService } from './generate_dkim_tokens_service';

function getDomainVerificationStatus(userId, sender) {
  return GetDomainVerificationStatusService.status(userId, sender)
    .then(statusResult => Promise.resolve(buildDomainVerificationFields(statusResult)));
}

function buildDomainVerificationFields(verificationResult) {
  debug('SenderDecoratorService domainVerificationResult: ', JSON.stringify(verificationResult));
  return {
    domainVerified: verificationResult.VerificationStatus === 'Success',
    domainVerificationStatus: verificationResult.VerificationStatus,
    domainVerificationToken: verificationResult.VerificationToken
  };
}

function getDkimStatus(userId, sender) {
  return GetDkimStatusService.status(userId, sender)
    .then(statusResult => Promise.resolve(buildDkimFields(statusResult)));
}

function buildDkimFields(verificationResult) {
  debug('SenderDecoratorService dkimVerificationResult: ', JSON.stringify(verificationResult));
  return {
    dkimEnabled: verificationResult.DkimEnabled,
    dkimVerified: verificationResult.DkimVerificationStatus === 'Success',
    dkimVerificationStatus: verificationResult.DkimVerificationStatus,
    dkimTokens: verificationResult.DkimTokens
  };
}

function getSpfStatus(userId, sender) {
  return GetSpfStatusService.status(userId, sender)
    .then(statusResult => Promise.resolve(buildSpfFields(statusResult)));
}

function buildSpfFields(verificationResult) {
  debug('SenderDecoratorService spfVerificationResult: ', JSON.stringify(verificationResult));
  return {
    spfEnabled: verificationResult
  };
}

function getDmarcStatus(userId, sender) {
  return GetDmarcStatusService.status(userId, sender)
    .then(statusResult => Promise.resolve(buildDmarcFields(statusResult)));
}

function buildDmarcFields(verificationResult) {
  debug('SenderDecoratorService spfVerificationResult: ', JSON.stringify(verificationResult));
  return {
    dmarcEnabled: verificationResult
  };
}

export class SenderDecoratorService {
  static async getStatuses(userId, sender) {
    const results = await this.provideDomainDkimSpfStatuses(userId, sender);
    if (results.domainVerificationStatus === 'Failed') {
      await GenerateDomainVerificationTokensService.generate(userId, sender.id);
    }

    if (results.dkimVerificationStatus === 'Failed') {
      await GenerateDkimTokensService.generate(userId, sender.id);
    }
    // return this.provideDomainDkimSpfStatuses(userId, sender);

    // avoid one call to aws because of throttling
    return results;
  }

  static provideDomainDkimSpfStatuses(userId, sender) {
    const operations = [getDomainVerificationStatus(userId, sender), getDkimStatus(userId, sender), getSpfStatus(userId, sender), getDmarcStatus(userId, sender)];
    return Promise.all(operations)
      .then(results => Promise.resolve(Object.assign({}, results[0], results[1], results[2], results[3], sender)));
  }
}
