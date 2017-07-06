define([], function() {
    'use strict';
    return {
	compMk: "#\
# Main component makefile.\
#\
# This Makefile can be left empty. By default, it will take the sources in the \
# src/ directory, compile them and link them into lib(subdirectory_name).a \
# in the build directory. This behaviour is entirely configurable,\
# please read the ESP-IDF documents if you need to do this.\
#",

	"Component": {
	    "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": [
		"#ifndef _{{obj.sanitizedName.toUpperCase()}}_INCLUDE_GUARD_",
		"#define _{{obj.sanitizedName.toUpperCase()}}_INCLUDE_GUARD_",
		"{{obj.Declarations}}",
		"#endif  // _{{obj.sanitizedName.toUpperCase()}}_INCLUDE_GUARD_",
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": [
		"#include \"{{obj.sanitizedName}}.hpp\"",
		"{{obj.Definitions}}"
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
	}
	"Task": {
	    "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": [
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": [
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
	},
	"Timer": {
	    "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": [
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": [
	    ].join('\n'),
	    "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
	},
    };
});
