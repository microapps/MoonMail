# MoonMail (BETA)

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Twitter](https://img.shields.io/twitter/url/https/github.com/microapps/MoonMail.svg?style=social)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2Fmicroapps%2FMoonMail%2F)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/microapps/MoonMail/master/LICENSE)
[![Gitter](https://badges.gitter.im/microapps/MoonMail.svg)](https://gitter.im/microapps/MoonMail?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Send email marketing campaigns with [Amazon SES](https://aws.amazon.com/ses/). Let [Amazon Lambda](https://aws.amazon.com/lambda/) compose email by email and literaly scale it to infinite. 

With MoonMail you can: create & edit lists of recipients (email addresses) and store them within a [DynamoDB](https://aws.amazon.com/dynamodb/). Create & edit html email marketing campaigns, send them and track their opens and clicks.

**The biggest magic of MoonMail: SEND BILLIONS OF EMAILS WITH NO SERVERS!**

[See the wiki for detailed specs and infrastructure graphs.] (https://github.com/microapps/MoonMail/wiki)


## Live Features

* [Create and store recipients in lists](https://github.com/microapps/MoonMail/wiki/Lists-&-recipients)
* [Compile and send email campaigns](https://github.com/microapps/MoonMail/wiki/Sender)
* [Parse (track) opened emails + clicked links within an email](https://github.com/microapps/MoonMail/wiki/Links)


## Upcoming Features

###Campaigns+Autoresponders
* [Create, edit and delete campaigns](https://github.com/microapps/MoonMail/wiki/Campaigns)
* Create, edit and delete autoresponders
* Apply [liquid](https://shopify.github.io/liquid/) syntax within the campaigns and autoresponders

###Recipients
* Extend the recipient fields with liquid tags (extra values like: gender, country...)
* Update the recipient status with any of the following: Unsubscribed, Bounced, Complaint-Spam, Suppresion-list

###Other
* Download the full Serverless project as a Node.js® module
* Basic front / UI to manage lists and to send campaigns 


## Getting Started

You need to have installed the [Serverless Framework](https://github.com/serverless/serverless) (version 0.5.2 or higher is required to run the MoonMail API).

Initialize the Serverless project:
    
    sls project init
    
Create all the needed resources in your AWS account:

    sls resources deploy

Deploy all the Lambda functions:

    sls function deploy
    
Deploy MoonMail events:

    sls event deploy

Create the API Gateway endpoints:

    sls endpoint deploy
    
## Contributing Guidelines
Contributions are always welcome! If you'd like to collaborate with us, take into account that:

* We use [ES2015](https://babeljs.io/docs/learn-es2015/) and love OOP.
* We test with [mocha](https://github.com/mochajs/mocha) + [chai](https://github.com/chaijs/chai) + [sinon](https://github.com/sinonjs/sinon).
* We submit a PR to the `develop` branch whenever we want to upload new code.

Feel free to <a href="mailto:hi@microapps.com">contact us</a> if you have any question!


## License

MoonMail is available under the MIT license. See the LICENSE file for more info.

## Professional Help

If you need support getting MoonMail into production in your AWS account, contact the experts:

- <a href="mailto:ryan@serverlesscode.com">ServerlessCode</a>
- <a href="mailto:sam@acloud.guru">A Cloud Guru - AWS training & serverless experts</a> (<a href="https://acloud.guru">Visit Web Site</a>)
