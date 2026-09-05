// jshint node: true
'use strict';

// webgme is an OPTIONAL peer: the CLI and the static playground do not
// need it, so it is not pulled in by a plain install. Only the editor
// server does, which is here.
//
// This runs before ANY other require, `./config` included: every
// config file pulls in `webgme/config/validator` (and the default one
// `webgme/config/config.default`), so loading config first crashed
// with a bare MODULE_NOT_FOUND and this message never printed. Resolve
// rather than require, so nothing is loaded just to ask.
try {
    require.resolve('webgme');
} catch (e) {
    console.error('The WebGME editor needs the webgme package, which is an');
    console.error('optional dependency. Install it with:');
    console.error('');
    console.error('  npm install webgme');
    console.error('');
    console.error('The hfsm-gen / hfsm-diff CLIs and the static playground');
    console.error('do not need it -- see docs/CLI.md and docs/PLAYGROUND.md.');
    process.exit(1);
}

var gmeConfig = require('./config'),
    webgme = require('webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    //console.log('server up');
});
