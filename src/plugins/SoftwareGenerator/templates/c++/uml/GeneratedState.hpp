#ifndef __STATE_BASE__INCLUDE_GUARD
#define __STATE_BASE__INCLUDE_GUARD

#incldue <vector>

#include "Event.hpp"

namespace StateMachine {

  /**
   * States contain other states and can consume generic
   * StateMachine::Event objects if they have internal or external
   * transitions on those events and if those transitions' guards are
   * satisfied. Only one transition can consume an event in a given
   * state machine.
   *
   * There is also a different kind of Event, the tick event, which is
   * not consumed, but instead executes from the top-level state all
   * the way to the curently active leaf state.
   *
   * Entry and Exit actions also occur whenever a state is entered or
   * exited, respectively.
   */
  class <%- state.name %> : public StateBase {
  public:
    /**
     * @brief Runs the entry() function defined in the model and then
     *  calls _activeState->entry().
     */
    void                     entry ( void ) {
<%- state.Entry %>
      _activeState->entry();
    }

    /**
     * @brief Runs the exit() function defined in the model and then
     *  calls _activeState->exit().
     */
    void                     exit ( void ) {
<%- state.Exit %>
      _activeState->exit();
    }

    /**
     * @brief Runs the tick() function defined in the model and then
     *  calls _activeState->tick().
     */
    void                     tick ( void ) {
<%- state.Tick %>
      _activeState->tick();
    }

    /**
     * @brief Calls _activeState->handleEvent( event ), then if the
     *  event is not nullptr (meaning the event was not consumed by
     *  the child subtree), it checks the event against all internal
     *  transitions associated with that Event.  If the event is still
     *  not a nullptr (meaning the event was not consumed by the
     *  internal transitions), then it checks the event against all
     *  external transitions associated with that Event.
     *
     * @return true if event is consumed, falsed otherwise
     */
    bool                     handleEvent ( StateMachine::Event* event ) {
      bool handled = false;
      // handle internal transitions first
      switch ( event->type() ) {
<%
state.InternalTransitions.map(function(trans) {
-%>
      case <%- trans.Event %>:
	if ( <%- trans.Guard %> ) {
	  // run transition action
<%- trans.Action %>
          // make sure nothing else handles this event
	  handled = true;
	}
	break;
<%
});
-%>
      default:
	break;
      }
      if (!handled) {
	// handle external transitions here
	switch ( event->type() ) {
<%
state.ExternalTransitions.map(function(trans) {
-%>
        case <%- trans.Event %>:
          if ( <%- trans.Guard %> ) {
	    // run transition action
<%- trans.Action %>
            // make sure nothing else handles this event
	    handled = true;
	  }
	  break;
<%
});
-%>
	default:
	  break;
	}
      }
      if (!handled) {
	// now check parent states
	_parentState->handleEvent( event );
      }
      return handled;
    }

    /**
     * @brief Will be known from the model so will be generated in
     *  derived classes to immediately return the correct initial
     *  state pointer for quickly transitioning to the proper state
     *  during external transition handling.
     *
     * @return StateBase*  Pointer to initial substate
     */
    StateMachine::StateBase* getInitial ( void ) {
      return <%- state.getInitial() %>;
    }
  };
};

#endif // __STATE_BASE__INCLUDE_GUARD
