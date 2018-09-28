const omitEmpty =  require('omit-empty');

export function buildResponse({ statusCode = 200, body = {}, headers = {} }: any) {
  return {
    statusCode,
    headers: omitEmpty(
      Object.assign(
        {},
        {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        },
        headers
      )
    ),
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
