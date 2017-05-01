#ifndef __<%- task.sanitizedName %>__INCLUDE_GUARD
#define __<%- task.sanitizedName %>__INCLUDE_GUARD

#include <cstdint>

// Task Includes
<%- task.Includes %>

// Generated state functions and members for the task
namespace <%- task.sanitizedName %> {

  // Task Forward Declarations
<%- task.Declarations %>

  // Generated task function
  void  taskFunction ( void *pvParameter );

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

#endif // __<%- task.sanitizedName %>__INCLUDE_GUARD
