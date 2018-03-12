export default function decrypt(authToken) {
  return new Promise((resolve) => {
    resolve({sub: 'my-user-id', plan: 'gold'});
  });
}

export function getUserContext(userId) {
  return new Promise((resolve) => {
    resolve({id: 'my-user-id', plan: 'gold'});
  });
}
