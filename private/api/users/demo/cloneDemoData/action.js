import CloneDemoDataService from '../lib/clone_demo_data_service';
import { ApiErrors } from '../../../../lib/errors';

export async function respond(event, cb) {
  const modelUserId = process.env.MODEL_USER_ID;
  const demoUserId = process.env.DEMO_USER_ID;
  console.log(modelUserId, demoUserId);
  const service = new CloneDemoDataService(modelUserId, demoUserId);
  const cloned = await service.cloneData();
  return cb(null, true);
}

