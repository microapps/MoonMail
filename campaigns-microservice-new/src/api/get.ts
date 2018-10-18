import middy from 'middy';

import { NormalizedEvent } from "../../common/@types";
import decryptor from "../lib/auth-token-decryptor";
import campaignRepository from '../repositories/campaign';
import { apiRequestRoutine, logRoutine, normalizeListQueryParameters } from "../../common/middlewares";

export async function action({pathParameters: {id: campaignId}, headers: {Authorization: authToken}, queryStringParameters: {fields}}: NormalizedEvent) {
  const {sub: userId} = decryptor(authToken);

  return campaignRepository.get(userId, campaignId, fields);
}

export default middy(action)
  .use(apiRequestRoutine())
  .use(normalizeListQueryParameters())
  .use(logRoutine());