export function buildResponse({ statusCode = 200, body = {}, headers = {} }) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function buildRedirectResponse({ url }: any) {
  const headers = { Location: url };
  return buildResponse({ statusCode: 302, headers });
}

export function redirectTo({ url, callback }: any) {
  return callback(null, buildRedirectResponse({ url }));
}
