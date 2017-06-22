/**
 * @author Qishen Zhang  https://github.com/VictorCoder123
 */

define(['js/util',
	'bower/mustache.js/mustache.min',
	'css!./Simulator.css'],
       function(Util,
		mustache){
           'use strict';
	   
           var Simulator;

           /**
            * Simulator Constructor
            * Insert dialog modal into body and initialize editor with
            * customized options
            */
           Simulator = function () {
           };

           /**
            * @return {void}
            */
           Simulator.prototype.initialize = function ( ) {
               var self = this;

	       // Active state information
	       this._activeState = null;
           };
           return Simulator;
       });
