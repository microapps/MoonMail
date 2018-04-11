# MoonMail-v2-campaigns-microservice

## Configuration

You will have to provide a configuration file named
`config.<stage>.json` see `./sample-config.dev.json` for examples.

## Deployment

```
yarn run sls deploy [-s <stage> -r <region> --profile <aws-profile>]
```

Default values are privided via the `config.<stage>.json` or inside the `serverless.yml`