# HashChain 'Solo'

## Overview

HashChain 'Solo'

Blockchain-styled datastore, which stores chained records with hash information into **single ledger** on **distributed datastore**.

This service **simulates** blockchain-styled ledger, with hash-chained records in NoSQL database(IBM Cloudant). So this service can provide benefits of both blockchain and NoSQL database:

This service is **semi** open source product, based on MIT license. You need (CouchDB based )IBM Cloudant for datastore, but service code itself is open.

- Easy install and Setup

    - This product is API application coded in Node.js and express. You can install it with normal `npm install`.

- Performance

    - This service does **NOT** use consensus-algorithm when storing data, which means inserting performance can be better than ones of blockchain.

- Various information can be stored

    - You can store JSON document of course. And you can attach file(s) in that document too. This means you can store binary information in this service.

    - You can also use this NoSQL database as state DB of this service. This means you can store master, binary, .. data in NoSQL database, and record data in this service.

- Various system infrastructure

    - We assume most of you would use IBM Cloudant, public managed DB service, as its datastore. But you can choose IBM Cloudant dedicated(private managed DB service), and IBM Cloudant local(on-premise DB software) as your preferences.

- Simple Web API

    - You can add/search data record with simple Web APIs, which are built on this service.

- Many extra functions like search

    - This service can provide search API with original search functions of NoSQL database, which is one of weak points of blockchain.

    - You can add not only search function, but also many other functions like map/reduce, indexing, .. etc in this service.

    - If you want to dump backup, you can do that with the ones of NoSQL database.

- Similar style datastore of blockchain

    - This service **simulates** blockchain-styled datastore(hash-chained serialized ledger). So you can create data easily. But once created, it would be very very difficult to delete/change them with right hash information.

- Semi-Open source

    - This service is **semi** open source product, based on MIT license. You need (CouchDB based )IBM Cloudant for datastore, but service code itself is open.

- No consensus-algorithm, synchronization, nor 51% attack in this service just because this has only one single ledger.

   - No consensus needed.

- Distributed datastore

    - Data can be stored in distributed database/location, which is a core functions of IBM Cloudant.

- No bulk insert provided

    - Original IBM Cloudant provide bulk insert API. But in this service, you can not use it, just because hash-chained datastore need to serialize insert request.

- And varieties of NoSQL database(IBM Cloudant) functions

    - For example, design document.

- Distributed datastore

    - This service manages data in **distributed datastore**, not **distributed ledger**.


## Pre-requisite before install

- IBM Cloud account

    - You can choose **Lite Account**, which is limited-use(but pay-free) account.

        - https://www.ibm.com/cloud-computing/jp/ja/bluemix/lite-account/

- IBM Cloudant service instance in IBM Cloud

    - You can also choose **Lite Plan** in IBM Cloud, which is also limited-use(but pay-free) plan.

        - https://console.bluemix.net/catalog/services/cloudant-nosql-db

    - After first launch(`$ node app`), database named **hashchainsolo** would be created automatically in IBM Cloudant. A design document would be automatically created also.

- Node.js and npm need to be installed in operating system.


## Install & Setup

- Login to IBM Cloud, and create IBM Cloudant service instance.

- Check your service credential(username and password) of IBM Cloudant

- Git clone/download source files:

    - https://github.com/dotnsf/hashchainsolo

- Edit settings.js with you IBM Cloudant username and password

- (Optional)Edit **exports.app_port** value in settings.js to change application listening port(default 3000).

- (Optional)Edit **exports.zerodigit** value in settings.js to change hash restriction level.

- (Optional)Edit **exports.search_analyzer** value and **exports.search_fields** value in settings.js to change search behavior.

    - (Optional)You might need to change content of DocRequest in public/doc/swagger.yaml for default JSON document format, if you edit this.

- (Optional)Edit **host** value in public/doc/swagger.yaml to use Swagger API Document externally.

- Install dependencies:

    - `$ npm install`

- Run

    - `$ node app`


## How to access swagger document

- http://xx.xx.xx.xx(:3000)/doc/


## How to access chain viewer

- http://xx.xx.xx.xx(:3000)/


## REST APIs

- POST /doc

  - Insert document in hashchainsolo.

- GET /docs

  - Get all stored documents.

- GET /validate

  - Get all stored&validated documents with chained style.

- GET /doc/:id

  - Get specified document with its id.

- GET /search

  - Full text search.


## References

- CouchDB(Cloudant) HTTP API Reference

    - http://docs.couchdb.org/en/2.1.1/http-api.html

- Cloudant(npm) API Reference

    - https://www.npmjs.com/package/cloudant#api-reference

- Subway Map Visualization jQuery Plugin

    - https://kalyani.com/blog/2010/10/08/subway-map-visualization-jquery-plugin/


## Licensing

This code is licensed under MIT.

https://github.com/dotnsf/hashchainsolo/blob/master/LICENSE


<!--
## Special Thanks

Ami Sugama gave me lots of suggestions and comments for this product. Thanks with love.
-->


## Copyright

2018 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
