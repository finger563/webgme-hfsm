#include "<%- task.taskName %>.hpp"

using namespace <%- task.taskName %>;

// User definitions for the task
<%- task.Definitions %>

// Generated state variables
uint32 changeState = 0;
uint32 stateDelay = 0;
<%
for (var i=0; i<model.numHeirarchyLevels; i++) {
-%>
uint8  stateLevel_<%- i %>;
<%
}
-%>

// Generated task function
void taskFunction ( void *pvParameter ) {
  // initialize here
  changeState = 0;
  stateDelay = <%- stateDelay(task.initState.timerPeriod) %>;
  <%- task.initState.stateName %>_setState();
  // execute the init transition for the state
  <%- task.initFunc %>
  // now loop running the state code
  while (true) {
    // run the proper state function
<%
    if ( task.State_list ) {
      task.State_list.map(function(state) {
-%>
    <%- state.stateName %>_execute();
<%
	});
    }
-%>
    // now wait if we haven't changed state
    if (!changeState) {
      vTaskDelay(stateDelay / portTICK_PERIOD_MS);
    }
  }
}

// Generated state functions
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
<%- state['Periodic Function'] %>
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
  else if ( <%- transition.Guard %> ) {
    changeState = 1;
    // run the current state's finalization function
    <%- state.stateName %>_finalization();
    // set the current state to the state we are transitioning to
    <%- transition.finalState.stateName %>_setState();
    // start state timer (@ next states period)
    stateDelay = <%- stateDelay(transition.finalState.timerPeriod) %>;
    // execute the transition function
    <%- transition.transitionFunc %>
  }
<%
  });
}
-%>
}

void <%- state.stateName %>_finalization( void ) {
  <%- state.Finalization %>
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
   
