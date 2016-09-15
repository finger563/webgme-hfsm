

define(['q'], function(Q) {
    'use strict';
    return {
	loadModel: function(core, modelNode, doProcessModel) {
	    var self = this;

	    var nodeName = core.getAttribute(modelNode, 'name'),
	    nodePath = core.getPath(modelNode),
	    nodeType = core.getAttribute(core.getBaseType(modelNode), 'name'),
	    parentPath = core.getPath(core.getParent(modelNode)),
	    attributes = core.getAttributeNames(modelNode),
	    childPaths = core.getChildrenPaths(modelNode),
	    pointers = core.getPointerNames(modelNode),
	    sets = core.getSetNames(modelNode);

	    self.model = {
		'objects': {
		},
		'root': {
		    name: nodeName,
		    path: nodePath,
		    type: nodeType,
		    parentPath: parentPath,
		    childPaths: childPaths,
		    attributes: {},
		    pointers: {},
		    sets: {}
		}
	    };
	    attributes.map(function(attribute) {
		var val = core.getAttribute(modelNode, attribute);
		self.model.root.attributes[attribute] = val;
		self.model.root[attribute] = val;
	    });
	    pointers.map(function(pointer) {
		self.model.root.pointers[pointer] = core.getPointerPath(modelNode, pointer);
	    });
	    sets.map(function(set) {
		self.model.root.sets[set] = core.getMemberPaths(modelNode, set);
	    });
	    self.model.objects[nodePath] = self.model.root;
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
			var nodeObj = {
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
			    nodeObj.attributes[attribute] = val;
			    nodeObj[attribute] = val;
			});
			pointers.map(function(pointer) {
			    nodeObj.pointers[pointer] = core.getPointerPath(node, pointer);
			});
			sets.map(function(set) {
			    nodeObj.sets[set] = core.getMemberPaths(node, set);
			});
			self.model.objects[nodePath] = nodeObj;
		    });
		    self.resolvePointers(self.model.objects);
                    self.model.root = self.model.objects[self.model.root.path];
		    if (doProcessModel)
			self.processModel(self.model);
		    return self.model;
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
	    var objPaths = Object.keys(self.model.objects);
	    objPaths.map(function(objPath) {
		var obj = self.model.objects[objPath];
		// figure out transition destinations, functions, and guards
		if (obj.type == 'Transition') {
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src && dst ) {
			// valid transition with source and destination pointers in the tree
			// - get the source pointer and add to its dictionary
			if (!src.transitions) {
			    src.transitions = {}
			}
			src.transitions[obj.path] = {
			    'guard' : obj.event,
			    'function' : obj.function,
			    'nextState' : dst.path
			};
		    }
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    var stateName = obj.name.replace(' ','_');
		    var parentObj = model.objects[obj.parentPath];
		    while (parentObj && parentObj.type == 'State') {
			stateName = parentObj.name.replace(' ','_') + '_'+stateName;
			parentObj = model.objects[parentObj.parentPath];
		    }
		    obj.stateName = 'state_'+stateName;
		    // make sure all states have transitions, even if empty!
		    if (!obj.transitions) {
			obj.transitions = {};
		    }
		}
	    });
	    // sort the libraries according to their order
	    if (self.model.root.Library_list) {
		self.model.root.Library_list.sort(function(a,b) {return a.order-b.order});
	    }
	    // figure out heirarchy levels and assign state ids
	    self.makeStateIDs(model);
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
	    if (model.root.State_list) {
		model.root.State_list.map(function(state) {
		    self.recurseStates(state, levels, 0);
		});
		model.root.numHeirarchyLevels = levels.length;
	    }
	},
    }
});
