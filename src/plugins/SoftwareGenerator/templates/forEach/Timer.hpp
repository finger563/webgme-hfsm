#ifndef __<%- timer.sanitizedName %>__INCLUDE_GUARD
#define __<%- timer.sanitizedName %>__INCLUDE_GUARD

#include "freertos/FreeRTOS.h"
#include "freertos/timers.h"
#include <cstdint>

// Timer Includes
<%- timer.Includes %>

// Generated state functions and members for the timer
namespace <%- timer.sanitizedName %> {

  // Timer Forward Declarations
<%- timer.Declarations %>

  // Generated timer function
  void  timerInitialize ( void );
  void  timerFunction   ( TimerHandle_t xTimer );

  // Generated state functions
<%
states.map(function(state) {
-%>
  void  <%- state.stateName %>_execute      ( void );
  void  <%- state.stateName %>_setState     ( void );
  void  <%- state.stateName %>_transition   ( void );
  void  <%- state.stateName %>_finalization ( void );
<%
});
-%>

};

#endif // __<%- timer.sanitizedName %>__INCLUDE_GUARD
