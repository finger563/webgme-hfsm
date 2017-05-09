'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = 8081;

//config.seedProjects.defaultProject = 'FiniteStateMachine';
config.seedProjects.basePaths = [__dirname + '/../src/seeds'];

// requirejs config
config.requirejsPaths.hfsm = "./src/common";
config.requirejsPaths['webgme-to-json'] = "./node_modules/webgme-to-json";

// Merging config
config.storage.autoMerge.enable = true;

// authentication
config.authentication.enable = true;
config.authentication.allowGuests = true;

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

// svg paths
var path = require('path');
config.visualization.svgDirs = [path.join(__dirname, '..', "./src/svgs")];

validateConfig(config);
module.exports = config;
