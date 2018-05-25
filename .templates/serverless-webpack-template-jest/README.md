# serverless-webpack-template-jest

This is a Serverless service template for the Serverless framework, it provides the latest JavaScript features(ES6 via Webpack + Babel, testing with mocha+chai+sinon, linting with ESLint, and formatting with Prettier) along with other interesting plugins such as **serverless-offline** and **serverless-plugin-aws-alerts** which are required on the most of serverless projects out there.

Once installed, you can create and deploy functions with the latest ES6 features in minutes, with linting and formatting baked in.

Note: Currently, this starter kit specifically targets AWS.

## Install

```bash
# If you don't already have the serverless cli installed, do that
yarn global add serverless

# Use the serverless cli to install this repo
serverless install --url https://github.com/ccverak/serverless-webpack-template-jest
```

## Configuration

Rename the directory at will, then change serverless.yml according to your needs, easy cake.

## License

MIT
