#include "Features_generated_states.hpp"

using namespace state_machine;
using namespace state_machine::Features;

// User Definitions for the HFSM
//::::/p/m::::Definitions::::


/* * *  Definitions for Root : /p/m  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
  log("\033[36mFeatures:/p/m HFSM Initialization\033[0m");
  //::::/p/m::::Initialization::::
  goLeft = false;
count = 0;
  // now set the states up properly
  // External Transition : Action for: /p/m/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/ti\033[0m");
  
  //::::/p/m/ti::::Action::::
  
  // State : entry for: /p/m/A
  _root->FEATURES_OBJ__STATEA_OBJ.entry();
  
  // initialize our new active state
  _root->FEATURES_OBJ__STATEA_OBJ.initialize();
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
      activeLeaf == static_cast<StateBase*>(&_root->FEATURES_OBJ__END_OBJ)) {
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

/* * *  Definitions for StateA : /p/m/A  * * */

// User Definitions for the HFSM
//::::/p/m/A::::Definitions::::


void Root::StateA::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // External Transition : Action for: /p/m/A/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/A/ti\033[0m");
  
  //::::/p/m/A/ti::::Action::::
  
  // State : entry for: /p/m/A/A1
  _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.entry();
  
  // initialize our new active state
  _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.initialize();
}

void Root::StateA::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateA::/p/m/A\033[0m");
  // Entry action for this state
  //::::/p/m/A::::Entry::::
  printf("A ENTRY\n");
}

void Root::StateA::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateA::/p/m/A\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/A::::Exit::::
      printf("A EXIT\n");
}

void Root::StateA::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateA::/p/m/A\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/A::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateA::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::StateA::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::BACK:
  case EventType::FINISH:
  case EventType::NEXT:
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
  case EventType::TOGGLE: {
    if ( false ) {  // makes generation easier :)
    }
    //::::/p/m/A/it::::Guard::::
    else if ( _root->count < 10 ) {
      _root->log("\033[37mGUARD [ _root->count < 10 ] for INTERNAL TRANSITION:/p/m/A/it evaluated to TRUE\033[0m");
      // run transition action
      //::::/p/m/A/it::::Action::::
      _root->count++; printf("TOGGLE %d\n", _root->count);
      // make sure nothing else handles this event
      handled = true;
    }
    break;
  }
  default:
    handled = false;
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->get_type() ) {
    case EventType::LOCAL_GO: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/lt\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
      // Local Transition : Action for: /p/m/lt
      _root->log("\033[36mTRANSITION::ACTION for /p/m/lt\033[0m");
      
      //::::/p/m/lt::::Action::::
      printf("LOCAL ACTION\n");
      // State : entry for: /p/m/A/A2
      _root->FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateA->StateA::StateA2\033[0m");
      
        // going into regular state
        _root->FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    case EventType::CHOOSE: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tc\033[0m");
        // Going into a choice pseudo-state, let it handle its
        // guards and perform the state transition
        if (false) { } // makes generation easier :)
        //::::/p/m/c1::::Guard::::
        else if ( _root->goLeft ) {
          _root->log("\033[37mGUARD [ _root->goLeft ] for EXTERNAL TRANSITION:/p/m/c1 evaluated to TRUE\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
        // State : exit for: /p/m/A
        _root->FEATURES_OBJ__STATEA_OBJ.exit();
        // External Transition : Action for: /p/m/tc
        _root->log("\033[36mTRANSITION::ACTION for /p/m/tc\033[0m");
        
        //::::/p/m/tc::::Action::::
        printf("CHOOSE ACTION\n");
        // External Transition : Action for: /p/m/c1
        _root->log("\033[36mTRANSITION::ACTION for /p/m/c1\033[0m");
        
        //::::/p/m/c1::::Action::::
        
        // State : entry for: /p/m/B
        _root->FEATURES_OBJ__STATEB_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: StateA->StateB\033[0m");
        
          // going into regular state
          _root->FEATURES_OBJ__STATEB_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
        }
        //::::/p/m/c3::::Guard::::
        else if ( _root->count > 5 ) {
          _root->log("\033[37mGUARD [ _root->count > 5 ] for EXTERNAL TRANSITION:/p/m/c3 evaluated to TRUE\033[0m");
          // Going into a choice pseudo-state, let it handle its
          // guards and perform the state transition
          if (false) { } // makes generation easier :)
          //::::/p/m/d1::::Guard::::
          else if ( _root->count > 8 ) {
            _root->log("\033[37mGUARD [ _root->count > 8 ] for EXTERNAL TRANSITION:/p/m/d1 evaluated to TRUE\033[0m");
            // Transitioning states!
            // Call all from prev state down exits
          _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
          // State : exit for: /p/m/A
          _root->FEATURES_OBJ__STATEA_OBJ.exit();
          // External Transition : Action for: /p/m/tc
          _root->log("\033[36mTRANSITION::ACTION for /p/m/tc\033[0m");
          
          //::::/p/m/tc::::Action::::
          printf("CHOOSE ACTION\n");
          // External Transition : Action for: /p/m/c3
          _root->log("\033[36mTRANSITION::ACTION for /p/m/c3\033[0m");
          
          //::::/p/m/c3::::Action::::
          
          // External Transition : Action for: /p/m/d1
          _root->log("\033[36mTRANSITION::ACTION for /p/m/d1\033[0m");
          
          //::::/p/m/d1::::Action::::
          
          // State : entry for: /p/m/B
          _root->FEATURES_OBJ__STATEB_OBJ.entry();
          // State : entry for: /p/m/B/B2
          _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ.entry();
          _root->log("\033[31mSTATE TRANSITION: StateA->StateB::StateB2\033[0m");
          
            // going into regular state
            _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ.initialize();
            // make sure nothing else handles this event
            handled = true;
          }
          else if ( true ) {
            _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/d2\033[0m");
            // Transitioning states!
            // Call all from prev state down exits
          _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
          // State : exit for: /p/m/A
          _root->FEATURES_OBJ__STATEA_OBJ.exit();
          // External Transition : Action for: /p/m/tc
          _root->log("\033[36mTRANSITION::ACTION for /p/m/tc\033[0m");
          
          //::::/p/m/tc::::Action::::
          printf("CHOOSE ACTION\n");
          // External Transition : Action for: /p/m/c3
          _root->log("\033[36mTRANSITION::ACTION for /p/m/c3\033[0m");
          
          //::::/p/m/c3::::Action::::
          
          // External Transition : Action for: /p/m/d2
          _root->log("\033[36mTRANSITION::ACTION for /p/m/d2\033[0m");
          
          //::::/p/m/d2::::Action::::
          
          // State : entry for: /p/m/A
          _root->FEATURES_OBJ__STATEA_OBJ.entry();
          // State : entry for: /p/m/A/A1
          _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.entry();
          _root->log("\033[31mSTATE TRANSITION: StateA->StateA::StateA1\033[0m");
          
            // going into regular state
            _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.initialize();
            // make sure nothing else handles this event
            handled = true;
          }
        }
        else if ( true ) {
          _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/c2\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
        // State : exit for: /p/m/A
        _root->FEATURES_OBJ__STATEA_OBJ.exit();
        // External Transition : Action for: /p/m/tc
        _root->log("\033[36mTRANSITION::ACTION for /p/m/tc\033[0m");
        
        //::::/p/m/tc::::Action::::
        printf("CHOOSE ACTION\n");
        // External Transition : Action for: /p/m/c2
        _root->log("\033[36mTRANSITION::ACTION for /p/m/c2\033[0m");
        
        //::::/p/m/c2::::Action::::
        
        // State : entry for: /p/m/A
        _root->FEATURES_OBJ__STATEA_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: StateA->StateA\033[0m");
        
          // going into regular state
          _root->FEATURES_OBJ__STATEA_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
        }
      }
      break;
    }
    case EventType::GO_HIST: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/th\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
      // State : exit for: /p/m/A
      _root->FEATURES_OBJ__STATEA_OBJ.exit();
      // External Transition : Action for: /p/m/th
      _root->log("\033[36mTRANSITION::ACTION for /p/m/th\033[0m");
      
      //::::/p/m/th::::Action::::
      
      // State : entry for: /p/m/B
      _root->FEATURES_OBJ__STATEB_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateA->StateB::ShallowHistory\033[0m");
      
        // going into shallow history pseudo-state
        _root->FEATURES_OBJ__STATEB_OBJ.setShallowHistory();
          // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    case EventType::GO_DEEP: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/td\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEA_OBJ.exitChildren();
      // State : exit for: /p/m/A
      _root->FEATURES_OBJ__STATEA_OBJ.exit();
      // External Transition : Action for: /p/m/td
      _root->log("\033[36mTRANSITION::ACTION for /p/m/td\033[0m");
      
      //::::/p/m/td::::Action::::
      
      // State : entry for: /p/m/B
      _root->FEATURES_OBJ__STATEB_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateA->StateB::DeepHistory\033[0m");
      
        // going into deep history pseudo-state
        _root->FEATURES_OBJ__STATEB_OBJ.setDeepHistory();
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
/* * *  Definitions for StateA::StateA1 : /p/m/A/A1  * * */

// User Definitions for the HFSM
//::::/p/m/A/A1::::Definitions::::


void Root::StateA::StateA1::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::StateA::StateA1::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateA::StateA1::/p/m/A/A1\033[0m");
  // Entry action for this state
  //::::/p/m/A/A1::::Entry::::
  printf("A1 ENTRY\n");
}

void Root::StateA::StateA1::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateA::StateA1::/p/m/A/A1\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/A/A1::::Exit::::
      printf("A1 EXIT\n");
}

void Root::StateA::StateA1::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateA::StateA1::/p/m/A/A1\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/A/A1::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateA::StateA1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::StateA::StateA1::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::BACK:
  case EventType::FINISH:
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
    case EventType::NEXT: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/A/t12\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.exitChildren();
      // State : exit for: /p/m/A/A1
      _root->FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ.exit();
      // External Transition : Action for: /p/m/A/t12
      _root->log("\033[36mTRANSITION::ACTION for /p/m/A/t12\033[0m");
      
      //::::/p/m/A/t12::::Action::::
      
      // State : entry for: /p/m/A/A2
      _root->FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateA::StateA1->StateA::StateA2\033[0m");
      
        // going into regular state
        _root->FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ.initialize();
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
  if (!handled) {
    // now check parent states
    handled = _parentState->handleEvent( event );
  }
  return handled;
}
/* * *  Definitions for StateA::StateA2 : /p/m/A/A2  * * */

// User Definitions for the HFSM
//::::/p/m/A/A2::::Definitions::::


void Root::StateA::StateA2::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::StateA::StateA2::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateA::StateA2::/p/m/A/A2\033[0m");
  // Entry action for this state
  //::::/p/m/A/A2::::Entry::::
  printf("A2 ENTRY\n");
}

void Root::StateA::StateA2::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateA::StateA2::/p/m/A/A2\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/A/A2::::Exit::::
      printf("A2 EXIT\n");
}

void Root::StateA::StateA2::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateA::StateA2::/p/m/A/A2\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/A/A2::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateA::StateA2::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::StateA::StateA2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::BACK:
  case EventType::FINISH:
  case EventType::NEXT:
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
/* * *  Definitions for StateB : /p/m/B  * * */

// User Definitions for the HFSM
//::::/p/m/B::::Definitions::::


void Root::StateB::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // External Transition : Action for: /p/m/B/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/B/ti\033[0m");
  
  //::::/p/m/B/ti::::Action::::
  
  // State : entry for: /p/m/B/B1
  _root->FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ.entry();
  
  // initialize our new active state
  _root->FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ.initialize();
}

void Root::StateB::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateB::/p/m/B\033[0m");
  // Entry action for this state
  //::::/p/m/B::::Entry::::
  printf("B ENTRY\n");
}

void Root::StateB::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateB::/p/m/B\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/B::::Exit::::
      printf("B EXIT\n");
}

void Root::StateB::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateB::/p/m/B\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/B::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateB::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::StateB::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CHOOSE:
  case EventType::GO_DEEP:
  case EventType::GO_HIST:
  case EventType::LOCAL_GO:
  case EventType::NEXT:
  case EventType::TOGGLE:
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
    case EventType::BACK: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tb\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEB_OBJ.exitChildren();
      // State : exit for: /p/m/B
      _root->FEATURES_OBJ__STATEB_OBJ.exit();
      // External Transition : Action for: /p/m/tb
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tb\033[0m");
      
      //::::/p/m/tb::::Action::::
      
      // State : entry for: /p/m/A
      _root->FEATURES_OBJ__STATEA_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateB->StateA\033[0m");
      
        // going into regular state
        _root->FEATURES_OBJ__STATEA_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    case EventType::FINISH: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tf\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEB_OBJ.exitChildren();
      // State : exit for: /p/m/B
      _root->FEATURES_OBJ__STATEB_OBJ.exit();
      // External Transition : Action for: /p/m/tf
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tf\033[0m");
      
      //::::/p/m/tf::::Action::::
      
      _root->log("\033[31mSTATE TRANSITION: StateB->End\033[0m");
      
        // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
        _root->FEATURES_OBJ__END_OBJ.makeActive();
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
/* * *  Definitions for StateB::StateB1 : /p/m/B/B1  * * */

// User Definitions for the HFSM
//::::/p/m/B/B1::::Definitions::::


void Root::StateB::StateB1::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::StateB::StateB1::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateB::StateB1::/p/m/B/B1\033[0m");
  // Entry action for this state
  //::::/p/m/B/B1::::Entry::::
  printf("B1 ENTRY\n");
}

void Root::StateB::StateB1::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateB::StateB1::/p/m/B/B1\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/B/B1::::Exit::::
      printf("B1 EXIT\n");
}

void Root::StateB::StateB1::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateB::StateB1::/p/m/B/B1\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/B/B1::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateB::StateB1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::StateB::StateB1::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CHOOSE:
  case EventType::GO_DEEP:
  case EventType::GO_HIST:
  case EventType::LOCAL_GO:
  case EventType::TOGGLE:
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
    case EventType::NEXT: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/B/t12\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ.exitChildren();
      // State : exit for: /p/m/B/B1
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ.exit();
      // External Transition : Action for: /p/m/B/t12
      _root->log("\033[36mTRANSITION::ACTION for /p/m/B/t12\033[0m");
      
      //::::/p/m/B/t12::::Action::::
      
      // State : entry for: /p/m/B/B2
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateB::StateB1->StateB::StateB2\033[0m");
      
        // going into regular state
        _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ.initialize();
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
  if (!handled) {
    // now check parent states
    handled = _parentState->handleEvent( event );
  }
  return handled;
}
/* * *  Definitions for StateB::StateB2 : /p/m/B/B2  * * */

// User Definitions for the HFSM
//::::/p/m/B/B2::::Definitions::::


void Root::StateB::StateB2::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // External Transition : Action for: /p/m/B/B2/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/B/B2/ti\033[0m");
  
  //::::/p/m/B/B2/ti::::Action::::
  
  // State : entry for: /p/m/B/B2/B2a
  _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ.entry();
  
  // initialize our new active state
  _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ.initialize();
}

void Root::StateB::StateB2::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateB::StateB2::/p/m/B/B2\033[0m");
  // Entry action for this state
  //::::/p/m/B/B2::::Entry::::
  printf("B2 ENTRY\n");
}

void Root::StateB::StateB2::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateB::StateB2::/p/m/B/B2\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/B/B2::::Exit::::
      printf("B2 EXIT\n");
}

void Root::StateB::StateB2::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateB::StateB2::/p/m/B/B2\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/B/B2::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateB::StateB2::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::StateB::StateB2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CHOOSE:
  case EventType::GO_DEEP:
  case EventType::GO_HIST:
  case EventType::LOCAL_GO:
  case EventType::NEXT:
  case EventType::TOGGLE:
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
/* * *  Definitions for StateB::StateB2::StateB2a : /p/m/B/B2/B2a  * * */

// User Definitions for the HFSM
//::::/p/m/B/B2/B2a::::Definitions::::


void Root::StateB::StateB2::StateB2a::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::StateB::StateB2::StateB2a::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateB::StateB2::StateB2a::/p/m/B/B2/B2a\033[0m");
  // Entry action for this state
  //::::/p/m/B/B2/B2a::::Entry::::
  printf("B2a ENTRY\n");
}

void Root::StateB::StateB2::StateB2a::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateB::StateB2::StateB2a::/p/m/B/B2/B2a\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/B/B2/B2a::::Exit::::
      printf("B2a EXIT\n");
}

void Root::StateB::StateB2::StateB2a::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateB::StateB2::StateB2a::/p/m/B/B2/B2a\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/B/B2/B2a::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateB::StateB2::StateB2a::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::StateB::StateB2::StateB2a::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CHOOSE:
  case EventType::GO_DEEP:
  case EventType::GO_HIST:
  case EventType::LOCAL_GO:
  case EventType::TOGGLE:
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
    case EventType::NEXT: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/B/B2/tab\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ.exitChildren();
      // State : exit for: /p/m/B/B2/B2a
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ.exit();
      // External Transition : Action for: /p/m/B/B2/tab
      _root->log("\033[36mTRANSITION::ACTION for /p/m/B/B2/tab\033[0m");
      
      //::::/p/m/B/B2/tab::::Action::::
      
      // State : entry for: /p/m/B/B2/B2b
      _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2B_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: StateB::StateB2::StateB2a->StateB::StateB2::StateB2b\033[0m");
      
        // going into regular state
        _root->FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2B_OBJ.initialize();
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
  if (!handled) {
    // now check parent states
    handled = _parentState->handleEvent( event );
  }
  return handled;
}
/* * *  Definitions for StateB::StateB2::StateB2b : /p/m/B/B2/B2b  * * */

// User Definitions for the HFSM
//::::/p/m/B/B2/B2b::::Definitions::::


void Root::StateB::StateB2::StateB2b::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::StateB::StateB2::StateB2b::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mENTRY::StateB::StateB2::StateB2b::/p/m/B/B2/B2b\033[0m");
  // Entry action for this state
  //::::/p/m/B/B2/B2b::::Entry::::
  printf("B2b ENTRY\n");
}

void Root::StateB::StateB2::StateB2b::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mEXIT::StateB::StateB2::StateB2b::/p/m/B/B2/B2b\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/B/B2/B2b::::Exit::::
      printf("B2b EXIT\n");
}

void Root::StateB::StateB2::StateB2b::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;
  _root->log("\033[36mTICK::StateB::StateB2::StateB2b::/p/m/B/B2/B2b\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/B/B2/B2b::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::StateB::StateB2::StateB2b::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::StateB::StateB2::StateB2b::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &goLeft = _root->goLeft;
  [[maybe_unused]] auto &count = _root->count;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CHOOSE:
  case EventType::GO_DEEP:
  case EventType::GO_HIST:
  case EventType::LOCAL_GO:
  case EventType::NEXT:
  case EventType::TOGGLE:
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
