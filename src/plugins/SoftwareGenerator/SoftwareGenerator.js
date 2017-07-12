/*globals define*/
/*jshint node:true, browser:true*/

/**
 * TODO: 
 *
 * * Generate plugin config based on loaded template files for the
 *    HFSM base as well as the toolchain and langauge specific choices
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    './templates/forEach/MetaTemplates',
    'webgme-to-json/webgme-to-json',
    'hfsm/processor',
    'q'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    MetaTemplates,
    webgmeToJson,
    processor,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of SoftwareGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin SoftwareGenerator.
     * @constructor
     */
    var SoftwareGenerator = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    SoftwareGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    SoftwareGenerator.prototype = Object.create(PluginBase.prototype);
    SoftwareGenerator.prototype.constructor = SoftwareGenerator;

    SoftwareGenerator.prototype.notify = function(level, msg) {
	var self = this;
	var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
	var max_msg_len = 100;
	if (level=='error')
	    self.logger.error(msg);
	else if (level=='debug')
	    self.logger.debug(msg);
	else if (level=='info')
	    self.logger.info(msg);
	else if (level=='warning')
	    self.logger.warn(msg);
	self.createMessage(self.activeNode, msg, level);
	self.sendNotification(prefix+msg);
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    SoftwareGenerator.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            nodeObject;

        // Default fails
        self.result.success = false;

	var currentConfig = self.getCurrentConfig();
	self.language = currentConfig.language;
	self.generateTestCode = currentConfig.generateTestCode;

	// the active node for this plugin is software -> project
	var projectNode = self.activeNode;
	self.projectName = self.core.getAttribute(projectNode, 'name');

	// artifact name that will be returned
	self.artifactName = self.project.projectId + '+' + self.branchName + '+' + self.projectName + '_generatedCode';

	self.projectModel = {}; // will be filled out by loadProjectModel (and associated functions)
	self.artifacts = {}; // will be filled out and used by various parts of this plugin

	webgmeToJson.notify = function(level, msg) {self.notify(level, msg);}

      	webgmeToJson.loadModel(self.core, self.rootNode, projectNode, true, true)
  	    .then(function (projectModel) {
		// make convenience members and extra data
		processor.processModel(projectModel);
		self.projectModel = projectModel;
		self.projectRoot = projectModel.root;
		self.projectObjects = projectModel.objects;
  	    })
	    .then(function () {
		return self.generateArtifacts();
	    })
	    .then(function () {
		self.notify('info', "Generated artifacts.");
        	self.result.setSuccess(true);
        	callback(null, self.result);
	    })
	    .catch(function (err) {
		self.notify('error', err);
        	self.result.setSuccess(false);
        	callback(err, self.result);
	    })
		.done();
    };

    SoftwareGenerator.prototype.generateArtifacts = function () {
	var self = this;

	var baseDir = [
	    self.projectRoot.sanitizedName
	].join('/');

	// make sure we can figure out exactly where we generated from
        self.artifacts[self.projectRoot.name + '_metadata.json'] = JSON.stringify({
    	    projectID: self.project.projectId,
            commitHash: self.commitHash,
            branchName: self.branchName,
            timeStamp: (new Date()).toISOString(),
            pluginVersion: self.getVersion()
        }, null, 2);

	self.notify('info', 'Generating HFSM Implementation in '+self.language);
	var hfsmArtifacts = MetaTemplates.renderHFSM( self.projectModel );
	self.artifacts = Object.assign(self.artifacts, hfsmArtifacts);

	if (self.generateTestCode) {
	    self.notify('info', 'Generating HFSM Test Bench!');
	    var testCodeArtifacts = MetaTemplates.renderTestCode( self.projectModel );
	    self.artifacts = Object.assign(self.artifacts, testCodeArtifacts);
	}

	var fileNames = Object.keys(self.artifacts);
	var artifact = self.blobClient.createArtifact(self.artifactName);
	var deferred = new Q.defer();
	artifact.addFiles(self.artifacts, function(err) {
	    if (err) {
		deferred.reject(err.message);
		return;
	    }
	    self.blobClient.saveAllArtifacts(function(err, hashes) {
		if (err) {
		    deferred.reject(err.message);
		    return;
		}
		self.result.addArtifact(hashes[0]);
		deferred.resolve();
	    });
	});
	return deferred.promise;
    };

    return SoftwareGenerator;
});
