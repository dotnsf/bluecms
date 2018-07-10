exports.db_username = '';
exports.db_password = '';
exports.db_name = 'bluecms';
exports.app_port = 0;
exports.app_theme = 'default';
exports.search_analyzer = 'japanese';
exports.superSecret = 'welovebluecms';
exports.nlc_username = '';
exports.nlc_password = '';
exports.nlc_name = 'bluecms';
exports.nlc_language = 'ja';
exports.nlc_url = '';

if( process.env.VCAP_SERVICES ){
  var VCAP_SERVICES = JSON.parse( process.env.VCAP_SERVICES );
  if( VCAP_SERVICES && VCAP_SERVICES.cloudantNoSQLDB ){
    exports.db_username = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.username;
    exports.db_password = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.password;
  }
  if( VCAP_SERVICES && VCAP_SERVICES.natural_language_classifier ){
    exports.nlc_username = VCAP_SERVICES.natural_language_classifier[0].credentials.username;
    exports.nlc_password = VCAP_SERVICES.natural_language_classifier[0].credentials.password;
    exports.nlc_url = VCAP_SERVICES.natural_language_classifier[0].credentials.url;
  }
}
