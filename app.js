// app.js

var cfenv = require( 'cfenv' );
var Cloudantlib = require( '@cloudant/cloudant' );
var express = require( 'express' );
var bodyParser = require( 'body-parser' );
var crypto = require( 'crypto' );
var jwt = require( 'jsonwebtoken' );
var app = express();

var settings = require( './settings' );
var appEnv = cfenv.getAppEnv();

var db = null;
var cloudant = null;
if( settings.db_username && settings.db_password ){
  var params = { account: settings.db_username, password: settings.db_password };
  if( settings.db_hostname ){
    var protocol = settings.db_protocol ? settings.db_protocol : 'http';
    var url = protocol + '://' + settings.db_username + ":" + settings.db_password + "@" + settings.db_hostname;
    if( settings.db_port ){
      url += ( ":" + settings.db_port );
    }
    params = { url: url };
  }
  cloudant = Cloudantlib( params );

  if( cloudant ){
    cloudant.db.get( settings.db_name, function( err, body ){
      if( err ){
        if( err.statusCode == 404 ){
          cloudant.db.create( settings.db_name, function( err, body ){
            if( err ){
              //. 'Error: server_admin access is required for this request' for Cloudant Local
              //. 'Error: insernal_server_error'
              db = null;
            }else{
              db = cloudant.db.use( settings.db_name );
              //. デザインドキュメント作成
              createDesignDocuments();
            }
          });
        }else{
          db = null;
        }
      }else{
        db = cloudant.db.use( settings.db_name );
        db.get( "_design/documents", {}, function( err, body ){
          if( err ){
            //. デザインドキュメント作成
            createDesignDocuments();
          }else{
          }
        });
      }
    });
  }
}

app.set( 'superSecret', settings.superSecret );
app.use( express.static( __dirname + '/public' ) );
//app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( bodyParser.urlencoded() );
app.use( bodyParser.json() );

app.post( '/login', function( req, res ){
  res.contentType( 'application/json' );
  var user_id = req.body.user_id;
  var password = req.body.password;

  //. Hash
  generateHash( password ).then( function( value ){
    password = value;

    db.get( user_id, { include_docs: true }, function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Not valid user_id/password.' }, 2, null ) );
        res.end();
      }else{
        if( user_id && password && user.password == password ){
          var token = jwt.sign( user, app.get( 'superSecret' ), { expiresIn: '25h' } );

          res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
          res.end();
        }else{
          res.status( 401 );
          res.write( JSON.stringify( { status: false, result: 'Not valid user_id/password.' }, 2, null ) );
          res.end();
        }
      }
    });
  });
});

app.post( '/adminuser', function( req, res ){
  res.contentType( 'application/json' );
  var user_id = 'admin'; //req.body.id;
  var password = req.body.password;
  if( !password ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No password provided.' }, 2, null ) );
    res.end();
  }else{
    //. Hash
    generateHash( password ).then( function( value ){
      password = value;

      db.get( user_id, { include_docs: true }, function( err, user ){
        if( err ){
          var user = {
            _id: user_id,
            password: password,
            name: 'admin',
            role: 0,
            email: 'admin@admin'
          };
          db.insert( user, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              res.write( JSON.stringify( { status: true, message: body }, 2, null ) );
              res.end();
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, result: 'User ' + user_id + ' already existed.' }, 2, null ) );
          res.end();
        }
      });
    });
  }
});


//. ここより上で定義する API には認証フィルタをかけない
//. ここより下で定義する API には認証フィルタをかける
app.use( function( req, res, next ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    return res.status( 403 ).send( { status: false, result: 'No token provided.' } );
  }

  jwt.verify( token, app.get( 'superSecret' ), function( err, decoded ){
    if( err ){
      return res.json( { status: false, result: 'Invalid token.' } );
    }

    req.decoded = decoded;
    next();
  });
});


app.post( '/doc', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'POST /doc' );
  //console.log( req.body );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          var doc = req.body;
          if( validateDocType( doc ) ){
            db.insert( doc, function( err, body ){ //. insert
              if( err ){
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                res.write( JSON.stringify( { status: true, message: body }, 2, null ) );
                res.end();
              }
            });
          }else{
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Invalid doc.type' }, 2, null ) );
            res.end();
          }
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});

app.post( '/attachment', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'POST /attachment' );

  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        var filepath = req.file.path;
        var filetype = req.file.mimetype;
        var ext = filetype.split( "/" )[1];
        var name = req.body.name;

        if( name && filepath ){
          var bin = fs.readFileSync( filepath );
          var bin64 = new Buffer( bin ).toString( 'base64' );
          var doc = {
            type: 'attachment',
            name: name,
            _attachments: {
              file: {
                content_type: filetype,
                data: bin64
              }
            }
          };

          if( validateDocType( doc ) ){
            db.insert( doc, function( err, body ){ //. insert
              if( err ){
                fs.unlink( filepath, function( err ){} );
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                fs.unlink( filepath, function( err ){} );
                res.write( JSON.stringify( { status: true, message: body }, 2, null ) );
                res.end();
              }
            });
          }else{
            fs.unlink( filepath, function( err ){} );
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Invalid doc.type' }, 2, null ) );
            res.end();
          }
        }else{
          if( filepath ){ fs.unlink( filepath, function( err ){} ); }
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'No name or No file' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});


app.get( '/doc/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'GET /doc/' + id );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          db.get( id, { include_docs: true }, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              res.write( JSON.stringify( { status: true, doc: body }, 2, null ) );
              res.end();
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});

app.get( '/attachment/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'GET /attachment/' + id );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          db.get( id, { include_docs: true }, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              //. body._attachments.(attachname) : { content_type: '', data: '' }
              if( body._attachments ){
                for( key in body._attachments ){
                  var attachment = body._attachments[key];
                  if( attachment.content_type ){
                    res.contentType( attachment.content_type );
                  }

                  //. 添付画像バイナリを取得する
                  db.attachment.get( id, key, function( err, buf ){
                    if( err ){
                      res.contentType( 'application/json; charset=utf-8' );
                      res.status( 400 );
                      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                      res.end();
                    }else{
                      res.end( buf, 'binary' );
                    }
                  });
                }
              }else{
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: 'No attachment found.' }, 2, null ) );
                res.end();
              }
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});

app.get( '/docs', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var type = req.query.type;
  console.log( 'GET /docs?type=' + type );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          db.list( { include_docs: true }, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              var docs = [];
              body.rows.forEach( function( doc ){
                var _doc = JSON.parse(JSON.stringify(doc.doc));
                if( _doc._id.indexOf( '_' ) !== 0 ){
                  if( !type || _doc.type == type ){
                    docs.push( _doc );
                  }
                }
              });
      
              var result = { status: true, docs: docs };
              res.write( JSON.stringify( result, 2, null ) );
              res.end();
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});


app.delete( '/doc/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'DELETE /doc/' + id );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        db.get( id, function( err, data ){
          if( err ){
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
            res.end();
          }else{
            db.destroy( id, data._rev, function( err, body ){
              if( err ){
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                res.write( JSON.stringify( { status: true }, 2, null ) );
                res.end();
              }
            });
          }
        });
      }
    });
  }
});


app.get( '/searchDocuments', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'GET /searchDocuments' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          var q = req.query.q;
          if( q ){
            db.search( 'documents', 'newSearch', { q: q }, function( err, body ){
              if( err ){
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                res.write( JSON.stringify( { status: true, result: body }, 2, null ) );
                res.end();
              }
            });
          }else{
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'parameter: q is required.' }, 2, null ) );
            res.end();
          }
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});

app.get( '/searchUsers', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'GET /searchUsers' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          var q = req.query.q;
          if( q ){
            db.search( 'users', 'newSearch', { q: q }, function( err, body ){
              if( err ){
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                res.write( JSON.stringify( { status: true, result: body }, 2, null ) );
                res.end();
              }
            });
          }else{
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'parameter: q is required.' }, 2, null ) );
            res.end();
          }
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});


app.post( '/reset', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'POST /reset' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user.role > 0 ){{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Operation not allowed.' }, 2, null ) );
        res.end();
      }else{
        if( db ){
          db.list( {}, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              var docs = [];
              body.rows.forEach( function( doc ){
                var _id = doc.id;
                if( _id.indexOf( '_' ) !== 0 ){
                  var _rev = doc.value.rev;
                  docs.push( { _id: _id, _rev: _rev, _deleted: true } );
                }
              });
              if( docs.length > 0 ){
                db.bulk( { docs: docs }, function( err ){
                  res.write( JSON.stringify( { status: true, message: docs.length + ' documents are deleted.' }, 2, null ) );
                  res.end();
                });
              }else{
                res.write( JSON.stringify( { status: true, message: 'No documents need to be deleted.' }, 2, null ) );
                res.end();
              }
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'db is failed to initialize.' }, 2, null ) );
          res.end();
        }
      }
    });
  }
});


function deleteDoc( doc_id ){
  console.log( "deleting document: " + doc_id );
  db.get( doc_id, function( err, data ){
    if( !err ){
      db.destroy( id, data._rev, function( err, body ){
      });
    }
  });
}

function validateDocType( doc ){
  var b = false;
  console.log( "validating document: " + doc._id );
  if( doc && doc.type ){
    switch( type ){
    case 'document':
      if( doc.title && doc.body && doc.user_id && doc.timestamp ){
        b = true;
      }
      break;
    case 'user':
      if( doc._id && doc.password && doc.name && doc.email && doc.role ){
        b = true;
      }
      break;
    case 'attachment':
      if( doc.name && doc._attachment ){
        b = true;
      }
      break;
    }
  }

  return b;
}

function sortDocuments( _docs ){
  return _docs;
}

function createDesignDocuments(){
  //. デザインドキュメント作成
  var design_doc_doc = {
    _id: "_design/documents",
    language: "javascript",
    views: {
      bytimestamp: {
        map: "function (doc) { if( doc.type && doc.type == 'document' ){ emit(doc._id, doc); } }"
      }
    },
    indexes: {
      newSearch: {
        "analyzer": "Japanese",
        "index": "function (doc) { index( 'default', [doc.title,doc.category,doc.body].join( ' ' ) ); }" };
      }
    }
  };
  db.insert( design_doc_doc, function( err, body ){
    if( err ){
      console.log( "db init: err" );
      console.log( err );
    }else{
      //console.log( "db init: " );
      //console.log( body );
    }
  } );

  var design_doc_user = {
    _id: "_design/users",
    language: "javascript",
    views: {
      bytimestamp: {
        map: "function (doc) { if( doc.type && doc.type == 'user' ){ emit(doc._id, doc); } }"
      }
    },
    indexes: {
      newSearch: {
        "analyzer": "Japanese",
        "index": "function (doc) { index( 'default', [doc.name,doc.email].join( ' ' ) ); }" };
      }
    }
  };
  db.insert( design_doc_user, function( err, body ){
    if( err ){
      console.log( "db init: err" );
      console.log( err );
    }else{
      //console.log( "db init: " );
      //console.log( body );
    }
  } );

  var design_doc_attachment = {
    _id: "_design/attachments",
    language: "javascript",
    views: {
      bytimestamp: {
        map: "function (doc) { if( doc.type && doc.type == 'attachment' ){ emit(doc._id, doc); } }"
      }
    },
    indexes: {
      newSearch: {
        "analyzer": "Japanese",
        "index": "function (doc) { index( 'default', [doc.name].join( ' ' ) ); }" };
      }
    }
  };
  db.insert( design_doc_user, function( err, body ){
    if( err ){
      console.log( "db init: err" );
      console.log( err );
    }else{
      //console.log( "db init: " );
      //console.log( body );
    }
  } );
}

function generateHash( data ){
  return new Promise( function( resolve, reject ){
    if( data ){
      //. hash 化
      var sha512 = crypto.createHash( 'sha512' );
      sha512.update( data );
      var hash = sha512.digest( 'hex' );
      resolve( hash );
    }else{
      resolve( null );
    }
  });
}


var port = /*appEnv.port ||*/ settings.app_port || 3000;
app.listen( port );
console.log( 'server started on ' + port );
