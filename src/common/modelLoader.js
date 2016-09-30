

define(['q'], function(Q) {
    'use strict';
    return {
	loadModel: function(core, modelNode, doResolve, doProcessModel) {
	    var self = this;
	    if (doResolve === undefined) {
		doResolve = false;
	    }
	    if (doProcessModel === undefined) {
		doProcessModel = false;
	    }

	    var nodeName = core.getAttribute(modelNode, 'name'),
	    nodePath = core.getPath(modelNode),
	    nodeType = core.getAttribute(core.getBaseType(modelNode), 'name'),
	    parentPath = core.getPath(core.getParent(modelNode)),
	    attributes = core.getAttributeNames(modelNode),
	    childPaths = core.getChildrenPaths(modelNode),
	    pointers = core.getPointerNames(modelNode),
	    sets = core.getSetNames(modelNode);

	    var model = {
		'objects': {
		},
		'root': nodePath
	    };
	    model.objects[nodePath] = {
		name: nodeName,
		path: nodePath,
		type: nodeType,
		parentPath: parentPath,
		childPaths: childPaths,
		attributes: {},
		pointers: {},
		sets: {}
	    };
	    attributes.map(function(attribute) {
		var val = core.getAttribute(modelNode, attribute);
		model.objects[nodePath].attributes[attribute] = val;
		model.objects[nodePath][attribute] = val;
	    });
	    pointers.map(function(pointer) {
		model.objects[nodePath].pointers[pointer] = core.getPointerPath(modelNode, pointer);
	    });
	    sets.map(function(set) {
		model.objects[nodePath].sets[set] = core.getMemberPaths(modelNode, set);
	    });
	    return core.loadSubTree(modelNode)
		.then(function(nodes) {
		    nodes.map(function(node) {
			nodeName = core.getAttribute(node, 'name');
			nodePath = core.getPath(node);
			nodeType = core.getAttribute(core.getBaseType(node), 'name');
			parentPath = core.getPath(core.getParent(node));
			attributes = core.getAttributeNames(node);
			childPaths = core.getChildrenPaths(node);
			pointers = core.getPointerNames(node);
			sets = core.getSetNames(node);
			model.objects[nodePath] = {
			    name: nodeName,
			    path: nodePath,
			    type: nodeType,
			    parentPath: parentPath,
			    childPaths: childPaths,
			    attributes: {},
			    pointers: {},
			    sets: {}
			};
			attributes.map(function(attribute) {
			    var val = core.getAttribute(node, attribute);
			    model.objects[nodePath].attributes[attribute] = val;
			    model.objects[nodePath][attribute] = val;
			});
			pointers.map(function(pointer) {
			    model.objects[nodePath].pointers[pointer] = core.getPointerPath(node, pointer);
			});
			sets.map(function(set) {
			    model.objects[nodePath].sets[set] = core.getMemberPaths(node, set);
			});
		    });

		    if (doResolve)
			self.resolvePointers(model.objects);

		    if (doProcessModel)
			self.processModel(model);

		    model.root = model.objects[model.root]

		    return model;
		});
	},
	resolvePointers: function(objects) {
	    var self = this;
            var objPaths = Object.keys(objects);
	    objPaths.map(function(objPath) {
                var obj = objects[objPath];
		// Can't follow parent path: would lead to circular data structure (not stringifiable)
		// follow children paths, these will always have been loaded
		obj.childPaths.map(function(childPath) {
		    var dst = objects[childPath];
		    if (dst) {
			var key = dst.type + '_list';
			if (!obj[key]) {
			    obj[key] = [];
			}
			obj[key].push(dst);
		    }
		});
		// follow pointer paths, these may not always be loaded!
		for (var pointer in obj.pointers) {
		    var path = obj.pointers[pointer];
		    var dst = objects[path];
		    if (dst)
			obj[pointer] = dst;
                    else if (pointer != 'base' && path != null)
                        self.logger.error(
                            'Cannot save pointer to object outside tree: ' + 
                                pointer + ', ' + path);
		}
		// follow set paths, these may not always be loaded!
		for (var set in obj.sets) {
		    var paths = obj.sets[set];
		    var dsts = [];
		    paths.map(function(path) {
                        var dst = objects[path];
			if (dst)
			    dsts.push(dst);
                        else if (path != null)
                            self.logger.error(
                                'Cannot save set member not in tree: ' + 
                                    set + ', ' + path);
                    });
		    obj[set] = dsts;
		}
	    });
	},
	processModel: function(model) {
	    var self = this;
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL
	    // get state outgoing transition guards
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// figure out transition destinations, functions, and guards
		if (obj.type == 'Transition') {
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src && dst ) {
			// valid transition with source and destination pointers in the tree
			if (!src.transitions) {
			    src.transitions = []
			}
			src.transitions.push({
			    'guard' : obj.event,
			    'function' : obj.function,
			    'prevState' : model.objects[src.path],
			    'nextState' : model.objects[dst.path],
			    'finalState': null,
			    'transitionFunc': ''
			});
		    }
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    var stateName = obj.name.replace(' ','_');
		    var parentObj = model.objects[obj.parentPath];
		    // make sure the state has a ParentState that either exists or is null
		    if (parentObj && parentObj.type == 'State') {
			obj.parentState = model.objects[obj.parentPath];
		    }
		    else {
			obj.parentState = null;
		    }
		    // make sure we have a relatively unique name for the state
		    while (parentObj && parentObj.type == 'State') {
			stateName = parentObj.name.replace(' ','_') + '_'+stateName;
			parentObj = model.objects[parentObj.parentPath];
		    }
		    // set the state name
		    obj.stateName = 'state_'+stateName;
		    // make sure all states have transitions, even if empty!
		    if (!obj.transitions) {
			obj.transitions = [];
		    }
		    // make sure the State_list is either a real list or null
		    if (!obj.State_list) {
			obj.State_list = null;
		    }
		    // update the prefix for the state function
		    obj.function = obj.function.replace(/^(\S|\s)/gm, "    $1");
		}
	    });
	    // sort the libraries according to their order
	    if (model.objects[model.root].Library_list) {
		model.objects[model.root].Library_list.sort(function(a,b) {return a.order-b.order});
	    }
	    // figure out heirarchy levels and assign state ids
	    self.makeStateIDs(model);
	    // make sure all state.transitions have valid .transitionFunc attributes
	    self.buildTransitionFuncs(model);
	},
	recurseStates: function(state, levels, level) {
	    var self = this;
	    if (levels.length <= level) {
		levels[level] = {
		    'numStatesInLevel': 0
		}
	    }
	    state.stateLevel = level;
	    state.stateID = levels[level].numStatesInLevel++;
	    if (state.State_list) {
		state.State_list.map(function(substate) {
		    self.recurseStates(substate, levels, level + 1);
		});
	    }
	},
	makeStateIDs: function(model) {
	    var self = this;
	    var levels = [];
	    if (model.objects[model.root].State_list) {
		model.objects[model.root].State_list.map(function(state) {
		    self.recurseStates(state, levels, 0);
		});
		model.objects[model.root].numHeirarchyLevels = levels.length;
	    }
	},
	getInitState: function(state) {
	    // does not recurse; simply gets the init state and does error checking
	    var self = this;
	    var initState = state;
            if (state.State_list && state.Initial_list) {
                if (state.Initial_list.length > 1)
                    throw new String("State " + state.name + ", " +state.path+" has more than one init state!");
                var init = state.Initial_list[0];
                if (init.transitions.length == 1) {
		    initState = init;
                }
                else {
                    throw new String("State " + state.name + ", " +state.path+" must have exactly one transition coming out of init!");
                }
            }
            else if (state.State_list) {
                throw new String("State " + state.name + ", " + state.path+" has no init state!");
            }
	    return initState;
	},
	getInitFunc: function(state) {
	    // recurses to build up the transition function for an arbitrarily nested set of init states.
	    var self = this;
            var tFunc = state.initialization + '\n';
	    var init = self.getInitState(state);
	    if (init != state && init.transitions.length) {
		var dst = init.transitions[0].nextState;
		tFunc += init.transitions[0].function + '\n' + self.getInitFunc(dst);
	    }
            return tFunc;	    
	},
	getStartState: function(state) {
	    // recurses to get the leaf init state
	    var self = this;
	    var start = state
	    var init = self.getInitState(state);
	    if (init != state && init.transitions.length) {
		var dst = init.transitions[0].nextState;
		start = self.getStartState(dst);
	    }
            return start;
	},
	buildTransitionFuncs: function(model) {
	    var self = this;
	    model.objects[model.root].initState = self.getStartState(model.objects[model.root]);
	    model.objects[model.root].initFunc = self.getInitFunc(model.objects[model.root]);
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == "State") {
		    obj.transitions.map(function(trans) {
			trans.transitionFunc = trans.function + '\n' + self.getInitFunc(trans.nextState);
			// update the prefix for the transition function
			trans.transitionFunc = trans.transitionFunc.replace(/^(\S|\s)/gm, '    $1');
			trans.finalState = self.getStartState(trans.nextState);
		    });
		}
	    });
	},
    }
});
