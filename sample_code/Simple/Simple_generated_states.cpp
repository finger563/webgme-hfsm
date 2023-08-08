#include "Simple_generated_states.hpp"

using namespace state_machine;
using namespace state_machine::Simple;

// User Definitions for the HFSM
//::::/9::::Definitions::::


/* * *  Definitions for Root : /9  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
  log("\033[36mSimple:/9 HFSM Initialization\033[0m");
  //::::/9::::Initialization::::
  
  // now set the states up properly
  // External Transition : Action for: /9/m
  _root->log("\033[36mTRANSITION::ACTION for /9/m\033[0m");
  
  //::::/9/m::::Action::::
  
  // State : entry for: /9/Y
  _root->SIMPLE_OBJ__STATE_1_OBJ.entry();
  
  // initialize our new active state
  _root->SIMPLE_OBJ__STATE_1_OBJ.initialize();
};

void Root::handle_all_events(void) {
  GeneratedEventBase* e;
  // get the next event and check if it's nullptr
  while ((e = event_factory.get_next_event())) {
    [[maybe_unused]] bool did_handle = handleEvent( e );
    log("\033[0mHANDLED " +
        e->to_string() +
        (did_handle ? ": \033[32mtrue" : ": \033[31mfalse") +
        "\033[0m");
    // free the memory that was allocated when it was spawned
    consume_event( e );
  }
}

void Root::terminate(void) {
  // will call exit() and exitChildren() on _activeState if it
  // exists
  exitChildren();
};

void Root::restart(void) {
  terminate();
  initialize();
};

bool Root::has_stopped(void) {
  bool reachedEnd = false;
  return reachedEnd;
};

bool Root::handleEvent(GeneratedEventBase *event) {
  bool handled = false;

  // Get the currently active leaf state
  StateBase *activeLeaf = getActiveLeaf();

  if (activeLeaf != nullptr && activeLeaf != this) {
    // have the active leaf handle the event, this will bubble up until
    // the event is handled or it reaches the root.
    handled = activeLeaf->handleEvent(event);
  }

  return handled;
}

/* * *  Definitions for State_2 : /9/v  * * */

// User Definitions for the HFSM
//::::/9/v::::Definitions::::


void Root::State_2::initialize ( void ) {
  // External Transition : Action for: /9/v/S
  _root->log("\033[36mTRANSITION::ACTION for /9/v/S\033[0m");
  
  //::::/9/v/S::::Action::::
  
  // State : entry for: /9/v/C
  _root->SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ.entry();
  
  // initialize our new active state
  _root->SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ.initialize();
}

void Root::State_2::entry ( void ) {
  _root->log("\033[36mENTRY::State_2::/9/v\033[0m");
  // Entry action for this state
  //::::/9/v::::Entry::::
  
}

void Root::State_2::exit ( void ) {
  _root->log("\033[36mEXIT::State_2::/9/v\033[0m");
  // Call the Exit Action for this state
  //::::/9/v::::Exit::::
  
}

void Root::State_2::tick ( void ) {
  _root->log("\033[36mTICK::State_2::/9/v\033[0m");
  // Call the Tick Action for this state
  //::::/9/v::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_2::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State_2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::INPUTEVENT:
    handled = true;
    break;
  default:
    handled = false;
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->get_type() ) {
  default:
    handled = false;
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->get_type() ) {
    default:
      handled = false;
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
/* * *  Definitions for State_2::State : /9/v/C  * * */

// User Definitions for the HFSM
//::::/9/v/C::::Definitions::::


void Root::State_2::State::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State_2::State::entry ( void ) {
  _root->log("\033[36mENTRY::State_2::State::/9/v/C\033[0m");
  // Entry action for this state
  //::::/9/v/C::::Entry::::
  
}

void Root::State_2::State::exit ( void ) {
  _root->log("\033[36mEXIT::State_2::State::/9/v/C\033[0m");
  // Call the Exit Action for this state
  //::::/9/v/C::::Exit::::
  
}

void Root::State_2::State::tick ( void ) {
  _root->log("\033[36mTICK::State_2::State::/9/v/C\033[0m");
  // Call the Tick Action for this state
  //::::/9/v/C::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_2::State::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State_2::State::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::INPUTEVENT:
    handled = true;
    break;
  default:
    handled = false;
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->get_type() ) {
  default:
    handled = false;
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->get_type() ) {
    default:
      handled = false;
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

// User Definitions for the HFSM
//::::/9/Y::::Definitions::::


void Root::State_1::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State_1::entry ( void ) {
  _root->log("\033[36mENTRY::State_1::/9/Y\033[0m");
  // Entry action for this state
  //::::/9/Y::::Entry::::
  
}

void Root::State_1::exit ( void ) {
  _root->log("\033[36mEXIT::State_1::/9/Y\033[0m");
  // Call the Exit Action for this state
  //::::/9/Y::::Exit::::
  
}

void Root::State_1::tick ( void ) {
  _root->log("\033[36mTICK::State_1::/9/Y\033[0m");
  // Call the Tick Action for this state
  //::::/9/Y::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State_1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State_1::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
    handled = true;
    break;
  default:
    handled = false;
    break;
  }

  if (handled) {
    // we didn't actually handle the event, but return anyway
    return false;
  }

  // handle internal transitions first
  switch ( event->get_type() ) {
  default:
    handled = false;
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->get_type() ) {
    case EventType::INPUTEVENT:
      if ( false ) { }  // makes generation easier :)
      //::::/9/k::::Guard::::
      else if ( _root->buttonPressed ) {
        _root->log("\033[37mGUARD [ _root->buttonPressed ] for EXTERNAL TRANSITION:/9/k evaluated to TRUE\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->SIMPLE_OBJ__STATE_1_OBJ.exitChildren();
      // State : exit for: /9/Y
      _root->SIMPLE_OBJ__STATE_1_OBJ.exit();
      // External Transition : Action for: /9/k
      _root->log("\033[36mTRANSITION::ACTION for /9/k\033[0m");
      
      //::::/9/k::::Action::::
      
      // State : entry for: /9/v
      _root->SIMPLE_OBJ__STATE_2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State_1->State_2\033[0m");
      
        // going into regular state
        _root->SIMPLE_OBJ__STATE_2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
    default:
      handled = false;
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
