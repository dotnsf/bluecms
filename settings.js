exports.db_username = '';
exports.db_password = '';
exports.db_name = 'bluecms';
exports.app_port = 3000;
exports.app_theme = 'default';
exports.search_analyzer = 'japanese';
exports.superSecret = 'welovebluecms';

if( process.env.VCAP_SERVICES ){
  var VCAP_SERVICES = JSON.parse( process.env.VCAP_SERVICES );
  if( VCAP_SERVICES && VCAP_SERVICES.cloudantNoSQLDB ){
    exports.cloudant_username = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.username;
    exports.cloudant_password = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.password;
  }
}
