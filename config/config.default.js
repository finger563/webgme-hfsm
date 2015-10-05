'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.seedProjects.basePaths.push('./seeds');

validateConfig(config);
module.exports = config;
