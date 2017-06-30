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
  class StateBase {
  public:
    /**
     * @brief Will be generated to run the entry() function defined in
     *  the model and then call _activeState->entry().
     */
    virtual void                     entry ( void );

    /**
     * @brief Will be generated to run the exit() function defined in
     *  the model and then call _activeState->exit().
     */
    virtual void                     exit ( void );

    /**
     * @brief Will be generated to run the tick() function defined in
     *  the model and then call _activeState->tick().
     */
    virtual void                     tick ( void );

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
    virtual bool                     handleEvent ( StateMachine::Event* event );

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
     * @brief Executes the entry() action, sets the activeState to the
     * initial state, and calls set initial on the child active state.
     */
    void                     setInitial ( void ) {
      entry();
      _activeState = getInitial();
      if (_activeState)
	_activeState->setInitial();
    }

    /**
     * @brief Will return the _activeState substate's initial state;
     *  calls _lastActiveState->getInitial()
     *
     * @return StateBase*  Pointer to last active substate
     */
    StateMachine::StateBase*         getShallowHistory ( void ) {
      return _lastActiveState->getInitial();
    }

    /**
     * @brief Sets the currentlyActive state to the last
     */
    void                             setShallowHistory ( void ) {
      _activeState = _lastActiveState;
      _activeState->setInitial();
    }

    /**
     * @brief Will return the _activeState substate's history state;
     *  calls _lastActiveState->getDeepHistory()
     */
    StateMachine::StateBase*         getDeepHistory ( void ) {
      return _lastActiveState->getDeepHistory();
    }

    /**
     * @brief Will set the _activeState substate's history state;
     *  calls _lastActiveState->setDeepHistory()
     */
    void                             setDeepHistory ( void ) {
      _activeState = _lastActiveState;
      _activeState->setDeepHistory();
    }

  protected:
    /**
     * Pointer to the currently active substate of this state.
     */
    *StateMachine::StateBase                           _activeState      = nullptr;

    /**
     * Pointer to the last active substate of this state.
     */
    *StateMachine::StateBase                           _lastActiveState  = nullptr;

    /**
     * Pointer to the parent state of this state.
     */
    *StateMachine::StateBase                           _parentState      = nullptr;
  };
  
};

#endif // __STATE_BASE__INCLUDE_GUARD
