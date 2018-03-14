const getAll = function getAllSubscriptions() {
  return new Promise((resolve, reject) => {
    const subscriptionsString = process.env.EVENT_SUBSCRIPTIONS;
    return resolve(JSON.parse(subscriptionsString));
  });
};

export default {
  getAll
};
