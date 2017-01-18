#include "_generated_states_.h"

uint32 changeState = 0;
uint32 stateDelay = 0;
<%
for (var i=0; i<model.numHeirarchyLevels; i++) {
-%>
uint8  stateLevel_<%- i %>;
<%
}
-%>

<%
states.map(function(state) {
-%>
const uint8 <%- state.stateName %> = <%- state.stateID %>;

void <%- state.stateName %>_execute( void ) {
  if (changeState || stateLevel_<%- state.stateLevel %> != <%- state.stateName %>)
    return;

  <%- state. stateName %>_transition();

  // execute all substates
<%
if (state.State_list) {
  state.State_list.map(function(subState) {
-%>
  <%- subState.stateName %>_execute();
<%
  });
}
-%>

  if (changeState == 0) {
<%- state.function %>
  }
}

void <%- state.stateName %>_setState( void ) {
  stateLevel_<%- state.stateLevel %> = <%- state.stateName %>;
<%
 if (state.parentState) {
-%>
  <%- state.parentState.stateName %>_setState();
<%
 }
-%>
}

void <%- state.stateName %>_transition( void ) {
  if (changeState)
    return;
<%
if (state.transitions) {
  state.transitions.map(function(transition) {
-%>
  else if ( <%- transition.guard %> ) {
    changeState = 1;
    // run the current state's finalization function
    <%- state.stateName %>_finalization();
    // set the current state to the state we are transitioning to
    <%- transition.finalState.stateName %>_setState();
    // start state timer (@ next states period)
    stateDelay = <%- parseInt(parseFloat(transition.finalState.timerPeriod)*32768.0) %>;
    // execute the transition function
    <%- transition.transitionFunc %>
  }
<%
  });
}
-%>
}

void <%- state.stateName %>_finalization( void ) {
  <%- state.finalization %>
<%
 if (state.parentState) {
-%>
  <%- state.parentState.stateName %>_finalization();
<%
 }
-%>
}

<%
});
-%>
   
