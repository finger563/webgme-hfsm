#include "Basic_generated_states.hpp"

using namespace state_machine;
using namespace state_machine::Basic;

// User Definitions for the HFSM
//::::/p/m::::Definitions::::


/* * *  Definitions for Root : /p/m  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
  log("\033[36mBasic:/p/m HFSM Initialization\033[0m");
  //::::/p/m::::Initialization::::
  startCount = 0;
  // now set the states up properly
  // External Transition : Action for: /p/m/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/ti\033[0m");
  
  //::::/p/m/ti::::Action::::
  
  // State : entry for: /p/m/Idle
  _root->BASIC_OBJ__IDLE_OBJ.entry();
  
  // initialize our new active state
  _root->BASIC_OBJ__IDLE_OBJ.initialize();
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
  // Get the currently active leaf state
  StateBase *activeLeaf = getActiveLeaf();
  if (activeLeaf != nullptr && activeLeaf != this &&
      activeLeaf == static_cast<StateBase*>(&_root->BASIC_OBJ__END_OBJ)) {
    reachedEnd = true;
  }
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

/* * *  Definitions for Idle : /p/m/Idle  * * */

// User Definitions for the HFSM
//::::/p/m/Idle::::Definitions::::


void Root::Idle::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::Idle::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mENTRY::Idle::/p/m/Idle\033[0m");
  // Entry action for this state
  //::::/p/m/Idle::::Entry::::
  printf("IDLE ENTRY\n");
}

void Root::Idle::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mEXIT::Idle::/p/m/Idle\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/Idle::::Exit::::
      printf("IDLE EXIT\n");
}

void Root::Idle::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mTICK::Idle::/p/m/Idle\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/Idle::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::Idle::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::Idle::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::ENDEVENT:
  case EventType::STOP:
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
    case EventType::START: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tStart\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->BASIC_OBJ__IDLE_OBJ.exitChildren();
      // State : exit for: /p/m/Idle
      _root->BASIC_OBJ__IDLE_OBJ.exit();
      // External Transition : Action for: /p/m/tStart
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tStart\033[0m");
      
      //::::/p/m/tStart::::Action::::
      _root->startCount++;
      // State : entry for: /p/m/Active
      _root->BASIC_OBJ__ACTIVE_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: Idle->Active\033[0m");
      
        // going into regular state
        _root->BASIC_OBJ__ACTIVE_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    default:
      handled = false;
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
/* * *  Definitions for Active : /p/m/Active  * * */

// User Definitions for the HFSM
//::::/p/m/Active::::Definitions::::


void Root::Active::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::Active::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mENTRY::Active::/p/m/Active\033[0m");
  // Entry action for this state
  //::::/p/m/Active::::Entry::::
  printf("ACTIVE ENTRY %d\n", _root->startCount);
}

void Root::Active::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mEXIT::Active::/p/m/Active\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/Active::::Exit::::
  
}

void Root::Active::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;
  _root->log("\033[36mTICK::Active::/p/m/Active\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/Active::::Tick::::
        printf("ACTIVE TICK\n");
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::Active::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::Active::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &startCount = _root->startCount;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::START:
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
    case EventType::STOP: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tStop\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->BASIC_OBJ__ACTIVE_OBJ.exitChildren();
      // State : exit for: /p/m/Active
      _root->BASIC_OBJ__ACTIVE_OBJ.exit();
      // External Transition : Action for: /p/m/tStop
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tStop\033[0m");
      
      //::::/p/m/tStop::::Action::::
      
      // State : entry for: /p/m/Idle
      _root->BASIC_OBJ__IDLE_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: Active->Idle\033[0m");
      
        // going into regular state
        _root->BASIC_OBJ__IDLE_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    case EventType::ENDEVENT: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tEnd\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->BASIC_OBJ__ACTIVE_OBJ.exitChildren();
      // State : exit for: /p/m/Active
      _root->BASIC_OBJ__ACTIVE_OBJ.exit();
      // External Transition : Action for: /p/m/tEnd
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tEnd\033[0m");
      
      //::::/p/m/tEnd::::Action::::
      
      _root->log("\033[31mSTATE TRANSITION: Active->End\033[0m");
      
        // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
        _root->BASIC_OBJ__END_OBJ.makeActive();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    default:
      handled = false;
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
