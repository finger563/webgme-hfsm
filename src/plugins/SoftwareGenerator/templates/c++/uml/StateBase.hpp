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
     * @brief Will be generated to call _activeState->tick() and then
     *  run the tick() function defined in the model.
     */
    virtual void                     tick ( void );

    /**
     * @brief Calls _activeState->handleEvent( event ), then if the
     *  event is not nullptr, iteratively calls handleEvent( event )
     *  on all internal transitions until either there are no more
     *  internal transitions or the event pointer is set to nullptr.
     *  If the event still exists after all internal transitions have
     *  been checked, then it calls handleEvent( event ) on all
     *  external transitions.
     *
     * @return true if event is consumed, falsed otherwise
     */
    virtual bool                     handleEvent ( StateMachine::Event* event );

    /**
     * @brief Will be known from the model so will be generated in
     *  derived classes to immediately return either true or false for
     *  quickly propagating special events
     *
     * @return true if the state has external transitions without
     * events and guards.
     */
    virtual bool                     handlesEnd ( void );

    /**
     * @brief Called when an End State is reached that is a child of
     *  this state. Checks to see if this state directly handles the
     *  end state, and if so, then directly transitions to the known
     *  state from the model that will be the next state. If this is
     *  the final end state (i.e. we have no state to transition to)
     *  then the state machine ends.
     */
    virtual void                     handleEnd ( void );

    /**
     * @brief Will be known from the model so will be generated in
     *  derived classes to immediately return the correct initial
     *  state pointer for quickly transitioning to the proper state
     *  during external transition handling.
     *
     * @return StateBase*  Pointer to initial substate
     */
    virtual StateMachine::StateBase* getInitial ( void );

    /**
     * @brief Will be known from the model so will be generated in
     *  derived classes to immediately set the _activeState to the
     *  proper state, after calling the state's Entry action.
     */
    virtual void                     setInitial ( void );

    /**
     * @brief Will return the _activeState substate's initial state;
     *  calls _activeState->getInitial()
     *
     * @return StateBase*  Pointer to last active substate
     */
    virtual StateMachine::StateBase* getShallowHistory ( void );

    /**
     * @brief Will set the _activeState substate's initial state;
     *  calls _activeState->setInitial()
     */
    virtual void                     setShallowHistory ( void );

    /**
     * @brief Will return the _activeState substate's history state;
     *  calls _activeState->getDeepHistory()
     */
    virtual StateMachine::StateBase* getDeepHistory ( void );

    /**
     * @brief Will set the _activeState substate's history state;
     *  calls _activeState->setDeepHistory()
     */
    virtual void                     setDeepHistory ( void );

    

  protected:
    /**
     * Pointer to the last active substate of this state.
     */
    *StateMachine::StateBase                           _activeState;
    /**
     * Pointer to the parent state of this state.
     */
    *StateMachine::StateBase                           _parentState;
    /**
     * List of pointers to all the child states.
     */
    std::vector<StateMachine::StateBase*>              _childStates;
  };
  
};

#endif // __STATE_BASE__INCLUDE_GUARD
