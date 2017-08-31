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
        'Choice Pseudostate': 'Choice Pseudostate',
        'Deep History Pseudostate': 'Deep History Pseudostate',
        'Shallow History Pseudostate': 'Shallow History Pseudostate',
        Language: 'Language',
        Models: 'Models',
        State: 'State',
        StateBase: 'StateBase',
        'Internal Transition': 'Internal Transition',
        'External Transition': 'External Transition',
        Library: 'Library',
        Event: 'Event',
        'State Machine': 'State Machine'
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
    var _isChoice = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['Choice Pseudostate']]);
    };
    var _isDeepHistory = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['Deep History Pseudostate']]);
    };
    var _isShallowHistory = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['Shallow History Pseudostate']]);
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
    var _isStateMachine = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES['State Machine']]);
    };

    return {
        getMetaTypes: _getMetaTypes,
        TYPE_INFO: {
            isEnd: _isEnd,
            isFCO: _isFCO,
            isInitial: _isInitial,
            isChoice: _isChoice,
            isDeepHistory: _isDeepHistory,
            isShallowHistory: _isShallowHistory,
            isLanguage: _isLanguage,
            isModels: _isModels,
            isState: _isState,
            isStateBase: _isStateBase,
            isTransition: _isTransition,
            isInternalTransition: _isInternalTransition,
            isStateMachine: _isStateMachine
        }
    };
});
