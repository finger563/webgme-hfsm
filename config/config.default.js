'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.seedProjects.defaultProject = 'FiniteStateMachine';
validateConfig(config);
module.exports = config;
