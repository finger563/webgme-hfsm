/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


//TODO does it really work with the fixed paths
define(['underscore'], function (_underscore) {
    'use strict';

    var META_TYPES = {
        'End State': 'End State',
        FCO: 'FCO',
        Initial: 'Initial',
        'Pseudo State': 'Pseudo State',
        Language: 'Language',
        Models: 'Models',
        State: 'State',
        StateBase: 'StateBase',
        'Internal Transition': 'Internal Transition',
        'External Transition': 'External Transition',
        Library: 'Library',
        Event: 'Event',
        UMLStateDiagram: 'UMLStateDiagram'
    },
        client = WebGMEGlobal.Client;

    function _getMetaTypes() {
        var metaNodes = client.getAllMetaNodes(),
            dictionary = {},
            i,
            name;

        for (i = 0; i < metaNodes.length; i += 1) {
            name = metaNodes[i].getAttribute('name');
            if (META_TYPES[name]) {
                dictionary[name] = metaNodes[i].getId();
            }
        }

        return dictionary;
    }

    //META ASPECT TYPE CHECKING
    var _isEnd = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['End State']]);
    };
    var _isFCO = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.FCO]);
    };
    var _isInitial = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Initial]);
    };
    var _isPseudo = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['Pseudo State']]);
    };
    var _isLanguage = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Language]);
    };
    var _isModels = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Models]);
    };
    var _isState = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.State]);
    };
    var _isStateBase = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.StateBase]);
    };
    var _isTransition = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['External Transition']]);
    };
    var _isInternalTransition = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['Internal Transition']]);
    };
    var _isUMLStateDiagram = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.UMLStateDiagram]);
    };

    return {
        getMetaTypes: _getMetaTypes,
        TYPE_INFO: {
            isEnd: _isEnd,
            isFCO: _isFCO,
            isInitial: _isInitial,
            isPseudo: _isPseudo,
            isLanguage: _isLanguage,
            isModels: _isModels,
            isState: _isState,
            isStateBase: _isStateBase,
            isTransition: _isTransition,
            isInternalTransition: _isInternalTransition,
            isUMLStateDiagram: _isUMLStateDiagram
        }
    };
});
