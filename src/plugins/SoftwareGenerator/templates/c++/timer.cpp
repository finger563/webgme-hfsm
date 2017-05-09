#include "<%- timer.sanitizedName %>.hpp"
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/timers.h"

#define MS_TO_TICKS( xTimeInMs ) (uint32_t)( ( ( TickType_t ) xTimeInMs * configTICK_RATE_HZ ) / ( TickType_t ) 1000 )

namespace <%- timer.sanitizedName %> {

  // User definitions for the timer
<%- timer.Definitions %>

  // Generated state variables
  bool     __change_state__ = false;
  uint32_t __state_delay__ = 0;
<%
for (var i=0; i<timer.numHeirarchyLevels; i++) {
-%>
  uint8_t  stateLevel_<%- i %>;
<%
}
-%>

  void timerInitialize ( void ) {
    // initialize here
    __change_state__ = false;
    __state_delay__ = <%- stateDelay(timer.initState['Timer Period']) %>;
    <%- timer.initState.stateName %>_setState();
    // execute the init transition for the initial state and timer
<%- timer.initFunc %>
  }

  // Generated timer function
  void timerFunction ( TimerHandle_t xTimer ) {
    // reset __change_state__ to false
    __change_state__ = false;
    // run the proper state function
<%
    if ( timer.State_list ) {
      timer.State_list.map(function(state) {
-%>
    <%- state.stateName %>_execute();
<%
      });
    }
-%>
    if ( __change_state__ ) {
      // change the period of the timer if we're changing states
      xTimerChangePeriod( xTimer,
                          MS_TO_TICKS( __state_delay__ ),
                          100);  // block for up to 100 ticks
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
