#ifndef __<%- task.taskName %>__INCLUDE_GUARD
#define __<%- task.taskName %>__INCLUDE_GUARD

// Task Forward Declarations
<%- task.Declarations %>

// Generated state functions and members for the task
namespace <%- task.taskName %> {

  void taskFunction ( void *pvParameter );

  extern uint32_t changeState;
  extern uint32_t stateDelay;
<%
for (var i=0; i<model.numHeirarchyLevels; i++) {
-%>
  extern uint8_t  stateLevel_<%- i %>;
<%
}
-%>

<%
states.map(function(state) {
-%>
  extern const uint8_t <%- state.stateName %>;
  void                 <%- state.stateName %>_execute      ( void );
  void                 <%- state.stateName %>_setState     ( void );
  void                 <%- state.stateName %>_transition   ( void );
  void                 <%- state.stateName %>_finalization ( void );
<%
});
-%>

};

#endif // __<%- task.taskName %>__INCLUDE_GUARD
