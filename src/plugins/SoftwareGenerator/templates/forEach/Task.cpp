#include "<%- task.sanitizedName %>.hpp"
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define MS_TO_TICKS( xTimeInMs ) (uint32_t)( ( ( TickType_t ) xTimeInMs * configTICK_RATE_HZ ) / ( TickType_t ) 1000 )

namespace <%- task.sanitizedName %> {

  // User definitions for the task
<%- task.Definitions %>

  // Generated state variables
  bool     __change_state__ = false;
  uint32_t __state_delay__ = 0;
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
    __change_state__ = false;
    __state_delay__ = <%- stateDelay(task.initState['Timer Period']) %>;
    <%- task.initState.stateName %>_setState();
    // execute the init transition for the initial state and task
<%- task.initFunc %>
    // now loop running the state code
    while (true) {
      // reset __change_state__ to false
      __change_state__ = false;
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
      if (!__change_state__) {
        vTaskDelay( MS_TO_TICKS(__state_delay__) );
      }
      else {
        vTaskDelay( MS_TO_TICKS(1) );
      }
    }
  }

  // Generated state functions
<%
states.map(function(state) {
-%>
  const uint8_t <%- state.stateName %> = <%- state.stateID %>;

  void <%- state.stateName %>_execute( void ) {
    if (__change_state__ || stateLevel_<%- state.stateLevel %> != <%- state.stateName %>)
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

    if (!__change_state__) {
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
    if (__change_state__)
      return;
<%
if (state.transitions) {
  state.transitions.map(function(transition) {
-%>
    else if ( <%- transition.Guard %> ) {
      __change_state__ = true;
      // run the current state's finalization function
      <%- state.stateName %>_finalization();
      // set the current state to the state we are transitioning to
      <%- transition.finalState.stateName %>_setState();
      // start state timer (@ next states period)
      __state_delay__ = <%- stateDelay(transition.finalState['Timer Period']) %>;
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
