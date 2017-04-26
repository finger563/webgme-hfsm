'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = 8081;

//config.seedProjects.defaultProject = 'FiniteStateMachine';
config.seedProjects.basePaths = [__dirname + '/../src/seeds'];

config.requirejsPaths.hfsm = "./src/common";
config.requirejsPaths['webgme-to-json'] = "./node_modules/webgme-to-json";

config.authentication.enable = true;
config.authentication.allowGuests = true;

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

validateConfig(config);
module.exports = config;
