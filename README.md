# MoonMail

[![Greenkeeper badge](https://badges.greenkeeper.io/microapps/MoonMail.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/microapps/MoonMail.svg?branch=master)](https://travis-ci.org/microapps/MoonMail)
[![Coverage Status](https://coveralls.io/repos/github/microapps/MoonMail/badge.svg?branch=master)](https://coveralls.io/github/microapps/MoonMail?branch=master)
[![Twitter](https://img.shields.io/twitter/url/https/github.com/microapps/MoonMail.svg?style=social)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2Fmicroapps%2FMoonMail%2F)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/microapps/MoonMail/master/LICENSE)
[![Gitter](https://badges.gitter.im/microapps/MoonMail.svg)](https://gitter.im/microapps/MoonMail?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Send email marketing campaigns with [Amazon SES](https://moonmail.io/amazon-ses-email-marketing/). Let [Amazon Lambda](https://aws.amazon.com/lambda/) compose email by email and literaly scale it to infinite. 

With [MoonMail](https://moonmail.io/) you can: create & edit lists of recipients (email addresses) and store them within a [DynamoDB](https://aws.amazon.com/dynamodb/). Create & edit html email marketing campaigns, send them and track their opens and clicks.

**The biggest magic of MoonMail: SEND BILLIONS OF EMAILS WITH NO SERVERS!**

[See the wiki for detailed specs and infrastructure graphs.](https://github.com/microapps/MoonMail/wiki)


## Live Features

* [Create and store recipients in lists](https://github.com/microapps/MoonMail/wiki/Lists-&-recipients)
* [Compile and send email campaigns](https://github.com/microapps/MoonMail/wiki/Sender)
* [Parse (track) opened emails + clicked links within an email](https://github.com/microapps/MoonMail/wiki/Links)
* [Create, edit and delete campaigns](https://github.com/microapps/MoonMail/wiki/Campaigns)
* Schedule campaigns to be sent in the future
* Extend the recipient fields with extra values like: gender, country... [(Liquid powered)](https://shopify.github.io/liquid/)
* Update the recipient status with any of the following: Unsubscribed, Bounced, Complaint-Spam, Suppresion-list
* Create Automations
* Filter lists by Segments
* [React powered frontend / UI to send campaigns](https://microapps.github.io/MoonMail-UI/)
* Apply [liquid](https://shopify.github.io/liquid/) syntax within the campaigns
* [Public API to interact with the SAAS version](http://docs.moonmail.io)

## Free Perks

* [Free email verification and email list cleaning](https://moonmail.io/email-verification-email-list-cleaning/)

## Getting Started

### Requirements
- yarn ([Install instructions](https://yarnpkg.com/en/docs/install))
- serverless [Serverless Framework](https://github.com/serverless/serverless)

**Notes about the serverless version**

Version **0.5.x** is required to run several parts of the [MoonMail API](http://microapps.github.io/MoonMail/) such as the **api** and **events** sub-packages, for these, the root of the repository provides the required `s-project.json`, `s-resources-cf.json` and `s-templates.json`. Find more information about how to handle functions with serverless 0.5 [here](https://serverless.readme.io/v0.5.0/docs).

The rest of the services require serverless **1.x** and are self-contained. For details on how to manage them, you should follow the instructions provided in their respective README.md

### Dependencies

Install serverless 0.5 globally:
```
yarn global add serverless@0.5.6
```


Install the root project dependencies:
```
yarn install
```

Install the API dependencies:
```
cd api && yarn install
````

Install the event processors' dependencies:
```
cd events && yarn install
```

Installing the dependencies for the rest of the services follow the same convention. You just need to **cd** into it and **install** its dependencies.
    
### Initialize and configure the Serverless 0.5 project

```
sls project init -c -n your-lower-case-project-name
```
    
Configure the `s-variables-<stage>-<region>.json` files inside the `_meta` directory by providing the [required variables](required-variables.md).

### Deployment

#### Servereless 0.5 resources

Create all the needed resources in your AWS account:
```
sls resources deploy
```

Deploy all the Lambda functions:
```
sls function deploy
```
    
Deploy MoonMail events:
```
sls event deploy
```

Create the API Gateway endpoints:
```
sls endpoint deploy
```

**Troubleshooting:** 

Due to the amount of resources it might be difficult to deploy everything at once. It's totally fine to **cd** into sub-directories of **api** or **events** and perform the above mentioned actions in order to reduce the scope of deployments. Also, using the **dash deploy** subcommand might be useful when deploying independent functions. Aside from that, there are some functions depending on serverless 0.5 which require NodeJS > 4.3. For those, you will have to change the runtime version through the **AWS Lambda Console** because it's not supported to do so through Serverless on this version.

If the above doesn't solve your issues, there are a couple of things you should double check:

1.- Your current Serverless version (different parts of the project require different versions), this is how you can do it:
```
sls --version
```

2.- You have provided all the [required variables](required-variables.md) in the `_meta` directory.  

3.- An `admin.env` file should exist in the root of the project containing the **AWS** profile to be used by the deployments (this only applies for the function and resources depending on sls@0.5). Here is an example of what it should look like:
```
AWS_DEV_PROFILE=moonmail-dev
AWS_PROD_PROFILE=moonmail-prod  
```

4.- The provided profile in `admin.env` should exist in your `~/.aws/credentials`


#### Serverless 1.x resources

To configure and deploy these, you will have to follow the instructions provided in their respective README.md

## Live demo
If you have set up everything correctly you'll be able to send an email campaign using our [demo ui](https://microapps.github.io/MoonMail-UI)
    
## Questions?
Please pose your questions in [StackOverflow by tagging them with: moonmail](http://stackoverflow.com/questions/tagged/moonmail?sort=votes&pageSize=50). 

## Contributing Guidelines
Contributions are always welcome! If you'd like to collaborate with us, take into account that:

* We use ES >= 2015 and [babel](https://github.com/babel/babel) for transpilation.
* We test with [mocha](https://github.com/mochajs/mocha) + [chai](https://github.com/chaijs/chai) + [sinon](https://github.com/sinonjs/sinon).

Feel free to <a href="mailto:hi@microapps.com">contact us</a> if you have any question


## License

[MoonMail](https://moonmail.io/) is available under the MIT license. See the LICENSE file for more info.

## Professional Help

If you need support getting MoonMail into production in your AWS account, contact the [Email Marketing and Serverless Experts](https://moonmail.io/email-marketing-experts):

- <a href="mailto:ryan@serverlesscode.com">ServerlessCode</a>
- <a href="http://www.apiwise.nl">Apiwise</a>
- <a href="http://www.microapps.com">microapps</a>
- <a href="https://sc5.io">SC5</a>
- <a href="mailto:sam@acloud.guru">A Cloud Guru - AWS training & serverless experts</a> (<a href="https://acloud.guru">Visit Web Site</a>)
- <a href="mailto:hello@goltfisch.de">Just Serverless</a>

[Promote your Serverless services by creating a MoonMail account](https://app.moonmail.io/profile/experts)

MoonMail [Email Marketing Software](https://moonmail.io/) done the right way
