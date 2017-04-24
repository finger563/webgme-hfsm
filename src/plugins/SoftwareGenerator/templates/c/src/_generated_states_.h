#ifndef __GENERATED_STATES__INCLUDE_GUARD
#define __GENERATED_STATES__INCLUDE_GUARD

#include <intrinsics.h>
#include <string.h>
#include <stdio.h>

// Import user libraries here (if any)
<%
if (model.Library_list) {
  model.Library_list.map(function(library) {
-%>
#include "<%- library.name %>.h"
<%
  });
}
-%>

extern uint32 changeState;
extern uint32 stateDelay;
<%
for (var i=0; i<model.numHeirarchyLevels; i++) {
-%>
extern uint8  stateLevel_<%- i %>;
<%
}
-%>

<%
states.map(function(state) {
-%>
extern const uint8 <%- state.stateName %>;
void               <%- state.stateName %>_execute      ( void );
void               <%- state.stateName %>_setState     ( void );
void               <%- state.stateName %>_transition   ( void );
void               <%- state.stateName %>_finalization ( void );
<%
});
-%>

#endif // __GENERATED_STATES__INCLUDE_GUARD
