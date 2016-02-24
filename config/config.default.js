'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

validateConfig(config);
module.exports = config;
