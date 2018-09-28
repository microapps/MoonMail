import version from './handler';

describe('version', () => {
  it('executes as expected', async () => {
    expect(await version()).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': "*",
        'Access-Control-Allow-Credentials': true
      },
      body: '{"version":"0.0.1"}'
    })
  });
});
