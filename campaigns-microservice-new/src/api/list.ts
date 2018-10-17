import middy from 'middy';

import { NormalizedEvent } from '../../common/@types';
import decryptor from '../lib/auth-token-decryptor';
import campaign from '../repositories/campaign';
import { apiRequestRoutine, logRoutine, normalizeListQueryParameters } from '../../common/middlewares';

export async function action({queryStringParameters, headers: {Authorization: authToken}}: NormalizedEvent) {
  const {page, limit, fields, archived} = queryStringParameters;
  const {sub: userId} = decryptor(authToken);
  const filters = archived ? {archived: {eq: true}} : {archived: {ne: true}};

  return campaign.list(userId, {page, limit, filters, fields});
}

export default middy(action)
  .use(apiRequestRoutine())
  .use(normalizeListQueryParameters())
  .use(logRoutine());
