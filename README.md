# Blue CMS

This product( and this document ) is still under development.

## Overview


## Prerequisites

- IBM Cloud account

    - You can signup IBM Cloud Lite Account for free. But in this account, you can **not** use IBM Watson NLC(Natural Language Claasifier).

- Node.js application server

    - I strongly recommend to use IBM Cloud, SDK for Node.js runtime, just because it would be very easy to setup.

- IBM Cloudant service instance

    - You can choose Lite plan of IBM Cloudant for free.

- (Option)IBM Watson NLC(Natural Language Classifier) service instance

    - You can **not** create this service instance if you would use IBM Cloud Lite Account.


## Setup

- For users of IBM Cloud:

    - In IBM Cloud, create Node.js runtime, IBM Cloudant service, and IBM Watson NLC service.

    - In IBM Cloud console, you need to **bind** Node.js runtime to IBM Cloudant and NLC instances.

- For non-IBM Cloud users

    - Edit settings.js with your prefered username, password.


## Referers

- npm - Watson Developer Cloud

    - https://www.npmjs.com/package/watson-developer-cloud

- Watson Developer Cloud : Natural Language Classifier V1 API

    - http://watson-developer-cloud.github.io/node-sdk/master/classes/naturallanguageclassifierv1.html

## Licensing

This code is licensed under MIT.

https://github.com/dotnsf/bluecms/blob/master/LICENSE


## Copyright

2018 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
