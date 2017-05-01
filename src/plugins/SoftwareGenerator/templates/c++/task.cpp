#include "<%- task.sanitizedName %>.hpp"
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define MS_TO_TICKS( xTimeInMs ) (uint32_t)( ( ( TickType_t ) xTimeInMs * configTICK_RATE_HZ ) / ( TickType_t ) 1000 )

namespace <%- task.sanitizedName %> {

  // User definitions for the task
  <%- task.Definitions %>

  // Generated state variables
  uint32_t changeState = 0;
  uint32_t stateDelay = 0;
<%
for (var i=0; i<task.numHeirarchyLevels; i++) {
-%>
  uint8_t  stateLevel_<%- i %>;
<%
}
-%>

  // Generated task function
  void taskFunction ( void *pvParameter ) {
    // initialize here
    changeState = 0;
    stateDelay = <%- stateDelay(task.initState['Timer Period']) %>;
    <%- task.initState.stateName %>_setState();
    // execute the init transition for the initial state and task
<%- task.initFunc %>
    // now loop running the state code
    while (true) {
      // reset changeState to 0
      changeState = 0;
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
        vTaskDelay( MS_TO_TICKS(stateDelay) );
      }
    }
  }

  // Generated state functions
<%
states.map(function(state) {
-%>
  const uint8_t <%- state.stateName %> = <%- state.stateID %>;

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
      stateDelay = <%- stateDelay(transition.finalState['Timer Period']) %>;
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
    // Finalize parent state
    <%- state.parentState.stateName %>_finalization();
<%
 }
-%>
  }

<%
});
-%>
 
};
