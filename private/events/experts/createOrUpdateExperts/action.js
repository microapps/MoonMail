import omitEmpty from 'omit-empty';
import { strip } from 'eskimo-stripper';
import Promise from 'bluebird';
import { Expert } from '../../../lib/models/expert';
import { debug } from '../../../lib/index';

export async function respond(event, cb) {
  try {
    debug('= createOrUpdateExpert.action', JSON.stringify(event));
    const updatedUsers = event.Records.filter(record => record.eventName === 'MODIFY')
      .map(record => strip(record.dynamodb.NewImage));
    const deletedUsers = event.Records.filter(record => record.eventName === 'REMOVE')
      .map(record => strip(record.dynamodb.OldImage));

    const expertsToDelete = updatedUsers
      .filter(user => !user.expertData || !(user.expertData || {}).isExpert);
    const expertsToUpdate = updatedUsers
      .filter(user => user.expertData && (user.expertData || {}).isExpert);

    await Promise.map([...expertsToDelete, ...deletedUsers], user => deleteExpert(user), { concurrency: 3 });
    await Promise.map(expertsToUpdate, user => updateExpert(user), { concurrency: 3 });
    cb(null, { success: true });
  } catch (err) {
    cb(err);
  }
}

async function deleteExpert(user) {
  const expert = await Expert.get(user.id);
  if (expert.userId) {
    return Expert.delete(expert.userId);
  }
  return Promise.resolve({});
}

function updateExpert(user) {
  return Expert.save(omitEmpty({
    userId: user.id,
    expertType: user.expertData.type,
    country: user.expertData.country,
    email: user.expertData.email,
    company: user.expertData.company,
    websiteUrl: user.expertData.websiteUrl,
    logo: user.expertData.logo,
    description: user.expertData.description
  }));
}
