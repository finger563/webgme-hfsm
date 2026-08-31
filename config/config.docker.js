'use strict';

var config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

// Mongo connection resolution, in priority order:
//
//  1. MONGO_URI -- a complete connection string, e.g. a MongoDB Atlas
//     `mongodb+srv://user:pass@cluster.mongodb.net/webgme_hfsm?...`
//     URI. Use this when deploying the container to a cloud host
//     (Fly.io / Render / Railway / ...) with a managed database.
//     The UI-recording database defaults to the same URI; set
//     MONGO_URI_UI_RECORDING to store recordings elsewhere.
//  2. MONGO_PORT_27017_TCP_ADDR / _PORT -- legacy Docker link
//     environment variables.
//  3. The `mongo` hostname -- the docker-compose / devcontainer
//     service name.
var mongoUri, uiRecordingUri;
if (process.env.MONGO_URI) {
  mongoUri = process.env.MONGO_URI;
  uiRecordingUri = process.env.MONGO_URI_UI_RECORDING || mongoUri;
} else {
  var mongo = 'mongodb://';
  if (process.env.MONGO_PORT_27017_TCP_ADDR !== undefined) {
    mongo += process.env.MONGO_PORT_27017_TCP_ADDR + ':' + process.env.MONGO_PORT_27017_TCP_PORT;
  } else {
    mongo += 'mongo:27017';
  }
  mongoUri = mongo + '/webgme_hfsm';
  uiRecordingUri = mongo + '/webgme-ui-recording-data';
}

config.rest.components['UIRecorder'] = {
  src: __dirname + '/../node_modules/webgme-ui-replay/src/routers/UIRecorder/UIRecorder.js',
  mount: 'routers/UIRecorder',
    options: {
        mongo: {
            uri: uiRecordingUri,
            options: {}
        }
    }
};

config.mongo.uri = mongoUri;

validateConfig(config);

module.exports = config;
