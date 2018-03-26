// import Promise from 'bluebirrd';

// function wait(timeout) {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve();
//     }, timeout);
//   });
// }

// async function retry(promise, { maxRetries }) {

//   return Promise.each([...Array(maxRetries).keys()], attempt => promise
//   for (let i = 0; i <= maxRetries; i++) {
//     try {
//       await promise;
//     } catch (err) {
//       const timeout = Math.pow(2, i);
//       await wait(timeout);
//     }
//   }
// }
