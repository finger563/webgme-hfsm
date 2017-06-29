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
   */
  class StateBase {
  public:
    /**
     * Will be generated to call _activeState->tick() and then run the
     * tick() function defined in the model.
     */
    void                     tick ( void );

    /**
     * Calls _activeState->handleEvent( event ), then if the event is
     * not nullptr, iteratively calls handleEvent( event ) on all
     * internal transitions until either there are no more internal
     * transitions or the event pointer is set to nullptr.  If the
     * event still exists after all internal transitions have been
     * checked, then it calls handleEvent( event ) on all external
     * transitions.
     *
     * @return true if event is consumed, falsed otherwise
     */
    bool                     handleEvent ( StateMachine::Event* event );

    /**
     *  Will be known from the model so will be generated in derived
     *  classes to immediately return either true or false for quickly
     *  propagating special events
     *
     * @return true if the state has external transitions without
     * events and guards.
     */
    bool                     handlesEnd ( void );

    /**
     * Called when an End State is reached that is a child of this
     * state. Checks to see if this state directly handles the end
     * state, and if so, then directly transitions to the known state
     * from the model that will be the next state. If this is the
     * final end state (i.e. we have no state to transition to) then
     * the state machine ends.
     */
    void                     handleEnd ( void );

    /**
     *  Will be known from the model so will be generated in derived
     *  classes to immediately return the correct initial state
     *  pointer for quickly transitioning to the proper state during
     *  external transition handling.
     */
    *StateMachine::StateBase getInitial ( void );

    /**
     *  Will be known from the model so will be generated in derived
     *  classes to immediately set the _activeState to the proper
     *  state, after calling the state's Entry action.
     */
    *StateMachine::StateBase setInitial ( void );

    /**
     * Will return the _activeState substate's initial state; calls
     * _activeState->getInitial()
     */
    *StateMachine::StateBase getShallowHistory ( void );

    /**
     * Will set the _activeState substate's initial state; calls
     * _activeState->setInitial()
     */
    *StateMachine::StateBase setShallowHistory ( void );

    /**
     * Will return the _activeState substate's history state; calls
     * _activeState->getDeepHistory()
     */
    *StateMachine::StateBase getDeepHistory ( void );

    /**
     * Will set the _activeState substate's history state; calls
     * _activeState->setDeepHistory()
     */
    *StateMachine::StateBase getDeepHistory ( void );

    

  protected:
    *StateMachine::StateBase                           _activeState;
    *StateMachine::StateBase                           _parentState;
    std::vector<StateMachine::StateBase*>              _childStates;
  };
  
};

#endif // __STATE_BASE__INCLUDE_GUARD
