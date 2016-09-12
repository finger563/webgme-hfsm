/* Generated file based on ejs templates */
define([], function() {
    return {
    "script.bgs.ejs": "import \"constants.bgs\"\nimport \"globals.bgs\"\n\n<%\nif (model.Library_list) {\n  model.Library_list.map(function(library) {\n-%>\nimport \"<%- library.name %>.bgs\"\n<%\n  });\n}\n-%>\n\n# The timer handles all the state function code and state transition\n#  code\nevent hardware_soft_timer(handle)\n\nend\n\n# The interrupt routine handles all conversion from input interrupts\n#  to state variables for state transitions\nevent hardware_io_port_status(timestamp, port, irq, state_io)\n\nend\n\n<%\nif (model.Event_list) {\n  model.Event_list.map(function(event) {\n-%>\n<%- event.function %>\n<%\n  });\n}\n-%>\n"
}});