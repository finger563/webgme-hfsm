#include "Simple_GeneratedStates.hpp"

#ifdef DEBUG_OUTPUT
#include <iostream>
#endif

using namespace StateMachine::Simple;

// User Definitions for the HFSM
//::::/9::::Definitions::::


/* * *  Definitions for Root : /9  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
#ifdef DEBUG_OUTPUT
  std::cout << "Simple:/9 HFSM Initialization" << std::endl;
#endif
  //::::/9::::Initialization::::
  
  // now set the states up properly
  // External Transition : Action for: /9/m
  #ifdef DEBUG_OUTPUT
  std::cout << "TRANSITION::ACTION for /9/m" << std::endl;
  #endif
  
  //::::/9/m::::Action::::
  
  // State : entry for: /9/Y
  _root->SIMPLE_OBJ__STATE_1_OBJ.entry();
  
  // initialize our new active state
  _root->SIMPLE_OBJ__STATE_1_OBJ.initialize();
};

void Root::terminate(void) {
  // will call exit() and exitChildren() on _activeState if it
  // exists
  exitChildren();
};

void Root::restart(void) {
  terminate();
  initialize();
};

bool Root::hasStopped(void) {
  bool reachedEnd = false;
  return reachedEnd;
};

bool Root::handleEvent(Event *event) {
  bool handled = false;

  // Get the currently active leaf state
  StateMachine::StateBase *activeLeaf = getActiveLeaf();

  if (activeLeaf != nullptr && activeLeaf != this) {
    // have the active leaf handle the event, this will bubble up until
    // the event is handled or it reaches the root.
    handled = activeLeaf->handleEvent(event);
  }

  return handled;
}

/* * *  Definitions for State_2 : /9/v  * * */
void Root::State_2::initialize ( void ) {
  // External Transition : Action for: /9/v/S
  #ifdef DEBUG_OUTPUT
  std::cout << "TRANSITION::ACTION for /9/v/S" << std::endl;
  #endif
  
  //::::/9/v/S::::Action::::
  
  // State : entry for: /9/v/C
  _root->SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ.entry();
  
  // initialize our new active state
  _root->SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ.initialize();
}

void Root::State_2::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State_2::/9/v" << std::endl;
  #endif
  // Entry action for this state
  //::::/9/v::::Entry::::
  
}

void Root::State_2::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State_2::/9/v" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/9/v::::Exit::::
  
}

void Root::State_2::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State_2::/9/v" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/9/v::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_2::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State_2::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::INPUTEVENT:
    handled = true;
    break;
  default:
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->type() ) {
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
    default:
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
/* * *  Definitions for State_2::State : /9/v/C  * * */
void Root::State_2::State::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State_2::State::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State_2::State::/9/v/C" << std::endl;
  #endif
  // Entry action for this state
  //::::/9/v/C::::Entry::::
  
}

void Root::State_2::State::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State_2::State::/9/v/C" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/9/v/C::::Exit::::
  
}

void Root::State_2::State::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State_2::State::/9/v/C" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/9/v/C::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_2::State::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State_2::State::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::INPUTEVENT:
    handled = true;
    break;
  default:
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->type() ) {
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
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
/* * *  Definitions for State_1 : /9/Y  * * */
void Root::State_1::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State_1::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State_1::/9/Y" << std::endl;
  #endif
  // Entry action for this state
  //::::/9/Y::::Entry::::
  
}

void Root::State_1::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State_1::/9/Y" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/9/Y::::Exit::::
  
}

void Root::State_1::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State_1::/9/Y" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/9/Y::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State_1::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
    handled = true;
    break;
  default:
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->type() ) {
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
    case Event::Type::INPUTEVENT:
      if ( false ) { }  // makes generation easier :)
      //::::/9/k::::Guard::::
      else if ( _root->buttonPressed ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "GUARD [ _root->buttonPressed ] for EXTERNAL TRANSITION:/9/k evaluated to TRUE" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->SIMPLE_OBJ__STATE_1_OBJ.exitChildren();
      // State : exit for: /9/Y
      _root->SIMPLE_OBJ__STATE_1_OBJ.exit();
      // External Transition : Action for: /9/k
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /9/k" << std::endl;
      #endif
      
      //::::/9/k::::Action::::
      
      // State : entry for: /9/v
      _root->SIMPLE_OBJ__STATE_2_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State_1->State_2" << std::endl;
      #endif
      
        // going into regular state
        _root->SIMPLE_OBJ__STATE_2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
    default:
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
