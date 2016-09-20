'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

//config.seedProjects.defaultProject = 'FiniteStateMachine';
config.seedProjects.basePaths = [__dirname + '/../src/seeds'];

config.requirejsPaths.hfsm = "./src/common";

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

validateConfig(config);
module.exports = config;
