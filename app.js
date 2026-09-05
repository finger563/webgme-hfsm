// jshint node: true
'use strict';

var fs = require('fs');

// The editor server's optional peers. ALL of them, not just webgme:
// config.default pulls in config.webgme, which points panelPaths and
// requirejsPaths at webgme-codeeditor and webgme-ui-replay, and adds
// webgme-to-json and codemirror on top. Naming one would just walk
// somebody to the next missing module -- or, for the requirejs paths,
// to a server that starts and then serves a broken editor.
//
// They are needed in two different senses, and asking the wrong way
// gets the wrong answer. webgme is REQUIRED, here and by every config
// file, so node resolution is the test. The other four are named as
// literal paths -- './node_modules/webgme-to-json',
// __dirname + '/../node_modules/webgme-ui-replay/...' -- and three of
// them have no main entry at all, so require.resolve reports them
// missing while they sit installed in node_modules. For those, being
// on disk where the config points IS the requirement.
var path = require('path');

var SERVER_PEERS = [
    { id: 'webgme', resolved: true },
    { id: 'webgme-codeeditor' },
    { id: 'webgme-to-json' },
    { id: 'webgme-ui-replay' },
    { id: 'codemirror' },
];

// This runs before ANY other require, `./config` included: every
// config file pulls in `webgme/config/validator` (and the default one
// `webgme/config/config.default`), so loading config first crashed
// with a bare MODULE_NOT_FOUND and this message never printed. Resolve
// rather than require, so nothing is loaded just to ask.
var missingPeers = SERVER_PEERS.filter(function (peer) {
    if (peer.resolved) {
        try {
            require.resolve(peer.id);
            return false;
        } catch (e) {
            return true;
        }
    }
    return !fs.existsSync(path.join(__dirname, 'node_modules', peer.id));
}).map(function (peer) { return peer.id; });

if (missingPeers.length) {
    console.error('The WebGME editor needs ' + missingPeers.length + ' package' +
                  (missingPeers.length === 1 ? '' : 's') + ' that a plain');
    console.error('install does not bring in, because they are optional:');
    console.error('');
    console.error('  npm install ' + missingPeers.join(' '));
    console.error('');
    console.error('From a checkout, `npm install && npm run setup` gets all of');
    console.error('them -- see the README. The hfsm-gen / hfsm-diff CLIs need');
    console.error('none of them. Building the playground is a checkout workflow;');
    console.error('see docs/CLI.md and docs/PLAYGROUND.md.');
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
