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
     *  calls the active child's entry() as _activeState->entry().
     */
    void                     entry ( void ) {
      // Now call the Entry action for this state
<%- state.Entry %>
      // Now call the entry function down the active branch to the
      // leaf
      if ( _activeState )
        _activeState->entry();
    }

    /**
     * @brief Runs the exit() function defined in the model and then
     *  calls the parent's _parentState->exit() if the parent's active
     *  child state has changed. If the parent's active child state
     *  has not changed, upwards tree traversal stops.
     */
    void                     exit ( void ) {
      if ( _parentState && _parentState->getActive() != this ) {
	// we are no longer the active state of the parent
<%- state.Exit %>
        _parentState->exit();
      }
      else if ( _parentState == nullptr ) {
	// we are a top level state, just call exit
<%- state.Exit %>
      }
    }

    /**
     * @brief Runs the tick() function defined in the model and then
     *  calls _activeState->tick().
     */
    void                     tick ( void ) {
<%- state.Tick %>
      if ( _activeState )
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
     * @param[in] StateMachine::Event* Event needing to be handled
     *
     * @return true if event is consumed, false otherwise
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
<%
  if ( trans.finalState.type == 'Choice Pseudostate' ) {
-%>
	    // We are going into a choice state, need to make sure we
	    // check all the outgoing transitions' guards and decide
	    // which state to go into, and run all the proper Actions,
	    // exit()s and entry()s.

            if ( false ) { } // just to have easier code generation :)
<%
    trans.finalState.ExternalTransitions.map(function(choiceTrans) {
-%>
	    else if ( <%- choiceTrans.Guard %> ) {
	      // set the new active state
	      <%- choiceTrans.finalState.VariableName %>->makeActive();
	      // call the exit() function for the old state
	      <%- trans.prevState.VariableName %>->exit();
	      // run the transition function (s)
<%- trans.transitionFunc %>
<%- choiceTrans.transitionFunc %>
              // call the entry() function for the new state from the
	      // common parent
	      <%- choiceTrans.commonParent %>->entry();
	      // make sure nothing else handles this event
	      handled = true;
	    }
<%
    });
-%>
<%
    if (trans.finalState.defaultTransition) {
-%>
	    else {
	      // set the new active state
	      <%- trans.finalState.defaultTransition.finalState.VariableName %>->makeActive();
	      // call the exit() function for the old state
	      <%- trans.prevState.VariableName %>->exit();
	      // run the transition function (s)
<%- trans.transitionFunc %>
<%- trans.finalState.defaultTransition.transitionFunc %>
              // call the entry() function for the new state from the
	      // common parent
	      <%- trans.finalState.defaultTransition.commonParent %>->entry();
	      // make sure nothing else handles this event
	      handled = true;
	    }
<%
    }
-%>
<%
  } else if ( trans.finalState.type == 'End State' ) {
-%>
	    // We are going into an end state, need to make sure we go
	    // to the correct final state and run all the proper
	    // Actions, exit()s, and entry()s.

	    // set the new active state
	    <%- trans.finalState.VariableName %>->makeActive();
            // call the exit() function for the old state
	    <%- trans.prevState.VariableName %>->exit();
            // run the transition function (s)
<%- trans.transitionFunc %>
            // call the entry() function for the new state from the
            // common parent
            <%- trans.commonParent %>->entry();
            // make sure nothing else handles this event
	    handled = true;
<%
  } else {
-%>
	    // We are going into either a regular state, deep history
	    // state, or a shallow history state, just need to make
	    // the right state active, run the exit()s, Action, and
	    // entry()s

	    // set the new active state
	    <%- trans.finalState.VariableName %>->makeActive();
            // call the exit() function for the old state
	    <%- trans.prevState.VariableName %>->exit();
            // run the transition function (s)
<%- trans.transitionFunc %>
            // call the entry() function for the new state from the
            // common parent
            <%- trans.commonParent %>->entry();
            // make sure nothing else handles this event
	    handled = true;
<%
  } // End if (trans.finalState.type) else if (...) else 
-%>
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
	handled = _parentState->handleEvent( event );
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
