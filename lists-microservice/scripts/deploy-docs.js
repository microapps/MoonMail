#!/usr/bin/env node

const program = require('commander');
const aws = require('aws-sdk');
const fs = require('fs');
const spectacle = require('spectacle-docs');
const jsf = require('json-schema-faker');
const Promise = require('bluebird');
const schemaTraverse = require('json-schema-traverse');

jsf.format('cuid', require('cuid'));
jsf.option({ alwaysFakeOptionals: true });
jsf.extend('chance', () => {
  const Chance = require('chance');
  const chance = new Chance();
  chance.mixin({
    metadata: () => ({
      name: chance.first(),
      surname: chance.last(),
      countryCode: chance.country(),
      foo: 'bar'
    })
  });
  return chance;
});

program
  .usage('[options]')
  .description('Deploy API Gateway documentation')
  .option('-r, --region [region]', 'AWS region')
  .option('-p, --profile [profile]', 'AWS profile')
  .option('-s, --stage [stage]', 'API Gateway stage')
  .option('-i, --api-id [apiId]', 'API Gateway ID')
  .parse(process.argv);

const credentials = new aws.SharedIniFileCredentials({profile: program.profile});
aws.config.credentials = credentials;
aws.config.region = program.region;
const apigateway = new aws.APIGateway();

const params = {
  exportType: 'swagger',
  restApiId: program.apiId,
  stageName: program.stage,
  accepts: 'application/json'
};

function replaceTitle(swaggerJson, newTitle) {
  const newBody = Object.assign({}, swaggerJson);
  newBody.info.title = newTitle;
  return newBody;
}

function shiftBasePath(swaggerJson) {
  const prefix = swaggerJson.basePath;
  const paths = Object.keys(swaggerJson.paths).reduce((newPaths, currentPath) => {
    const newPath = `${prefix}${currentPath}`;
    return Object.assign({}, newPaths, { [newPath]: swaggerJson.paths[currentPath] });
  }, {});
  return Object.assign({}, swaggerJson, { paths, basePath: '' });
}

function addFakerTypes(swaggerJson) {
  const json = Object.assign({}, swaggerJson);
  schemaTraverse(json, (schema, pointer, root, parentPointer, parentKey, parentSchema, key) => {
    if (!key) return;
    if (key.match(/id$/i)) {
      schema.format = 'cuid';
      parentSchema[key] = schema;
    }
    if (key.match(/url$/i)) {
      schema.chance = 'url';
      parentSchema[key] = schema;
    }
    if (key.match(/email$/i)) {
      schema.chance = 'email';
      parentSchema[key] = schema;
    }
    if (key === 'metadata') {
      schema.chance = 'metadata';
      parentSchema[key] = schema;
    }
  });
  return json;
}

function addExamples(swaggerJson) {
  const definitions = swaggerJson.definitions;
  const definitionEntries = Object.entries(definitions);
  return Promise.map(definitionEntries, ([key, schema]) => {
    const s = Object.assign({}, schema, { definitions });
    return jsf.resolve(s).then(sample => ({ [key]: sample }));
  })
    .then(samples => samples.reduce((total, el) => Object.assign(total, el), {}))
    .then((examples) => {
      return definitionEntries.reduce((total, [key, schema]) => {
        total[key] = Object.assign({}, schema, { example: examples[key] });
        return total;
      }, {});
    })
    .then(defs => Object.assign({}, swaggerJson, { definitions: defs }));
}

function generateDocs(swaggerJson) {
  const swaggerFilePath = '/tmp/moonmail-api-swagger.json';
  fs.writeFileSync(swaggerFilePath, JSON.stringify(swaggerJson));
  const options = {
    specFile: swaggerFilePath,
    silent: true,
    targetDir: '/tmp/moonmail-docs/'
  };
  spectacle(options);
}

apigateway.getExport(params).promise()
  .then(data => replaceTitle(JSON.parse(data.body), 'MoonMail API'))
  .then(swaggerBody => shiftBasePath(swaggerBody))
  .then(swaggerBody => addFakerTypes(swaggerBody))
  .then(swaggerBody => addExamples(swaggerBody))
  .then(swaggerBody => generateDocs(swaggerBody))
  .catch(console.log);
