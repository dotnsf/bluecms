// bulk_docs.js

var Cloudantlib = require( '@cloudant/cloudant' );
var crypto = require( 'crypto' );
var fs = require( 'fs' );
//var jwt = require( 'jsonwebtoken' );

var settings = require( './settings' );

var insert = true;
var filename = 'documents.json';

var user_id = null;
var pass = null;

for( var i = 2; i < process.argv.length; i ++ ){
  if( process.argv[i].charAt( 0 ) == '-' ){
    switch( process.argv[i].charAt( 1 ).toLowerCase() ){
    case 'd':
      insert = false;
      break;
    case 'i':
      insert = true;
      break;
    case 'f':
      filename = process.argv[i].substr( 2 );
      break;
    case 'u':
      user_id = process.argv[i].substr( 2 );
      break;
    case 'p':
      pass = process.argv[i].substr( 2 );
      break;
    }
  }
}

if( settings.db_username && settings.db_password ){
  //. Cloudant
  var params = { account: settings.db_username, password: settings.db_password };
  if( settings.db_hostname ){
    var protocol = settings.db_protocol ? settings.db_protocol : 'http';
    var url = protocol + '://' + settings.db_username + ":" + settings.db_password + "@" + settings.db_hostname;
    if( settings.db_port ){
      url += ( ":" + settings.db_port );
    }
    params = { url: url };
  }
  var cloudant = Cloudantlib( params );

  if( cloudant ){
    cloudant.db.get( settings.db_name, function( err, body ){
      if( !err ){
        var db = cloudant.db.use( settings.db_name );

        if( db ){

          if( insert ){
            if( user_id && pass ){
              //. Login
              generateHash( pass ).then( function( value ){
                pass = value;
                db.get( user_id, { include_docs: true }, function( err, user ){
                  if( user && user.password == pass ){
                    //var token = jwt.sign( user, settings.superSecret, { expiresIn: '25h' } );
                    fs.readFile( filename, 'utf-8', function( err, body ){
                      var docs = [];
                      var _docs = JSON.parse( body );
                      _docs.forEach( function( doc ){
                        doc.user = user;
                        doc.type = 'document';
                        doc.status = 1;
                        doc.timestamp = ( new Date() ).getTime();
                        docs.push( doc );
                      });
                      //console.log( docs );
                      db.bulk( { docs: docs }, function( err ){});
                      console.log( 'bulk insert done.' );
                    });
                  }else{
                    console.log( 'error: login failed.' );
                  }
                });
              });
            }else{
              console.log( 'usage: $ node bulk_docs.js [-d|-i -u(userid) -p(password) <-f(filename)>]' );
            }
          }else{
            db.list( { include_docs: true }, function( err, body ){
              if( !err ){
                var docs = [];
                body.rows.forEach( function( doc ){
                  var _id = doc.id;
                  var _doc = JSON.parse( JSON.stringify( doc.doc ) );
                  if( _id.indexOf( '_' ) !== 0 && _doc.type == 'document' ){
                    var _rev = _doc._rev;
                    docs.push( { _id: _id, _rev: _rev, _deleted: true } );
                  }
                });

                if( docs.length > 0 ){
                  //console.log( docs );
                  db.bulk( { docs: docs }, function( err ){});
                  console.log( 'bulk delete done.' );
                }
              }else{
                console.log( 'error: failed to list docs.' );
              }
            });
          }
        }
      }else{
        console.log( 'error: failed to access cloudant db.' );
      }
    });
  }else{
    console.log( 'error: failed to initialize cloudant.' );
  }
}else{
  console.log( 'usage: $ node bulk_docs.js [-d|-i -u(userid) -p(password) <-f(filename)>]' );
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
