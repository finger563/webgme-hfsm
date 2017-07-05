#ifndef __CHOICE_STATE_INCLUDE_GUARD__
#define __CHOICE_STATE_INCLUDE_GUARD__

#include "StateBase.hpp"

namespace StateMachine {

  /**
   * @brief Choice Pseudostates exist purely to re-implement the
   *  makeActive() function to actually set the right final state.
   */
  class ChoiceState : public StateMachine::StateBase {
  public:
    /**
     * @brief Immediately evaluates the guards on the External
     *  Transitions leaving this choice state to transition into the
     *  next state.
     *
     * @return true if a choice was made
     */
    bool handleChoice ( StateMachine::StateBase* activeLeaf ) {
      bool handled = false;
      // We are going into a choice state, need to make sure we
      // check all the outgoing transitions' guards and decide
      // which state to go into, and run all the proper Actions,
      // exit()s and entry()s.

      if ( false ) { } // just to have easier code generation :)
<%
    ExternalTransitions.map(function(choiceTrans) {
-%>
        else if ( <%- choiceTrans.Guard %> ) {
	  // set the new active state
	  <%- choiceTrans.finalState.VariableName %>->makeActive();
	  // call the exit() function for the old state
	  activeLeaf->exit();
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
    if (defaultTransition) {
-%>
	else {
	  // set the new active state
	  <%- defaultTransition.finalState.VariableName %>->makeActive();
	  // call the exit() function for the old state
	  activeLeaf->exit();
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
      return handled;
    }

    /**
     * @brief Updates the active state to be the result of the
     *  outgoing transitions of the choice pseudostate and their
     *  guards.
     */
    void makeActive ( void ) {

    }
  };
};

#endif // __CHOICE_STATE_INCLUDE_GUARD__
