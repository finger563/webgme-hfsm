'use strict';

var config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

var mongo = 'mongodb://';
if (process.env.MONGO_PORT_27017_TCP_ADDR !== undefined) {
  mongo += process.env.MONGO_PORT_27017_TCP_ADDR + ':' + process.env.MONGO_PORT_27017_TCP_PORT;
} else {
  mongo += 'mongo:27017'
}

config.rest.components['UIRecorder'] = {
  src: __dirname + '/../node_modules/webgme-ui-replay/src/routers/UIRecorder/UIRecorder.js',
  mount: 'routers/UIRecorder',
    options: {
        mongo: {
            uri: mongo+'/webgme-ui-recording-data',
            options: {}
        }
    }
};

config.mongo.uri = mongo+'/webgme_hfsm';

validateConfig(config);

module.exports = config;
