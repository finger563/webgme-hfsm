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
    StateBase ( ) : _parentState( nullptr ), _activeState( nullptr ) {}
    StateBase ( StateBase* _parent ) : _parentState( _parent ), _activeState( nullptr ) {}
    
    /**
     * @brief Will be generated to run the entry() function defined in
     *  the model and then call _activeState->entry().
     */
    virtual void                     entry ( void );

    /**
     * @brief Will be generated to run the exit() function defined in
     *  the model and then call _activeState->exit().
     *
     * @return StateMachine::StateBase* pointer to new root on which
     *                                  to call entry
     */
    virtual StateMachine::StateBase* exit ( void );

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
     * @param[in] StateMachine::Event* Event needing to be handled
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
     * @brief Will return _activeState if it exists, otherwise will
     *  return nullptr.
     *
     * @return StateBase*  Pointer to last active substate
     */
    StateMachine::StateBase*  getActiveChild ( void ) {
      return _activeState;
    }

    /**
     * @brief Will return the active leaf state, otherwise will return
     *  nullptr.
     *
     * @return StateBase*  Pointer to last active leaf state.
     */
    StateMachine::StateBase*  getActiveLeaf ( void ) {
      if (_activeState != nullptr)
	return _activeState->getActiveLeaf();
      else
	return this;
    }
    
    /**
     * @brief Will return _activeState if it exists, otherwise
     *  will return the initial state.
     *
     * @return StateBase*  Pointer to last active substate
     */
    StateMachine::StateBase*  getHistory ( void ) {
      StateMachine::StateBase* history = _activeState;
      if (history == nullptr)
	history = getInitial();
      return history;
    }

    /**
     * @brief Make this state the active substate of its parent and
     *  then recurse up through the tree to the root. 
     *
     *  *Should only be called on leaf nodes!*
     */
    void                      makeActive ( void ) {
      if (_parentState != nullptr) {
	_parentState.setActiveChild( this );
	_parentState.makeActive();
      }
    }

    /**
     * @brief Update the active child state.
     */
    void                      setActiveChild ( StateMachine::StateBase* childState ) {
      _activeState = childState;
    }

    /**
     * @brief Executes the entry() action, sets the activeState to the
     * initial state, and calls set initial on the child active state.
     */
    void                      setInitial ( void ) {
      setActiveChild( getInitial() );
      if (_activeState != nullptr)
	_activeState->setInitial();
    }

    /**
     * @brief Sets the currentlyActive state to the last
     */
    void                      setShallowHistory ( void ) {
      setActiveChild( getHistory() );
      if (_activeState != nullptr)
	_activeState->setInitial();
    }

    /**
     * @brief Will set the _activeState substate's history state;
     *  calls _lastActiveState->setDeepHistory()
     */
    void                      setDeepHistory ( void ) {
      setActiveChild( getHistory() );
      if (_activeState != nullptr)
	_activeState->setDeepHistory();
    }

    /**
     * @brief Will set the parent state.
     */
    void                      setParentState ( StateMachine::StateBase* parent ) {
      _parentState = parent;
    }

    /**
     * @brief Will return the parent state.
     */
    StateMachine::StateBase*  getParentState ( void ) {
      return _parentState;
    }

  protected:
    /**
     * Pointer to the currently or most recently active substate of
     * this state.
     */
    StateMachine::StateBase  *_activeState      = nullptr;

    /**
     * Pointer to the parent state of this state.
     */
    StateMachine::StateBase  *_parentState      = nullptr;
  };
  
};

#endif // __STATE_BASE__INCLUDE_GUARD
