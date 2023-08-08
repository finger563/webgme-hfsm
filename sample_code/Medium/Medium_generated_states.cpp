#include "Medium_generated_states.hpp"

using namespace state_machine;
using namespace state_machine::Medium;

// User Definitions for the HFSM
//::::/o::::Definitions::::


/* * *  Definitions for Root : /o  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
  log("\033[36mMedium:/o HFSM Initialization\033[0m");
  //::::/o::::Initialization::::
  
  // now set the states up properly
  // External Transition : Action for: /o/E
  _root->log("\033[36mTRANSITION::ACTION for /o/E\033[0m");
  
  //::::/o/E::::Action::::
  
  // State : entry for: /o/r
  _root->MEDIUM_OBJ__STATE1_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ.initialize();
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
      activeLeaf == static_cast<StateBase*>(&_root->MEDIUM_OBJ__END_STATE_OBJ)) {
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

/* * *  Definitions for State3 : /o/K  * * */

// User Definitions for the HFSM
//::::/o/K::::Definitions::::


void Root::State3::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State3::entry ( void ) {
  _root->log("\033[36mENTRY::State3::/o/K\033[0m");
  // Entry action for this state
  //::::/o/K::::Entry::::
  
}

void Root::State3::exit ( void ) {
  _root->log("\033[36mEXIT::State3::/o/K\033[0m");
  // Call the Exit Action for this state
  //::::/o/K::::Exit::::
  
}

void Root::State3::tick ( void ) {
  _root->log("\033[36mTICK::State3::/o/K\033[0m");
  // Call the Tick Action for this state
  //::::/o/K::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State3::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State3::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT1:
  case EventType::EVENT2:
  case EventType::EVENT4:
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
    case EventType::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/g\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE3_OBJ.exitChildren();
      // State : exit for: /o/K
      _root->MEDIUM_OBJ__STATE3_OBJ.exit();
      // External Transition : Action for: /o/g
      _root->log("\033[36mTRANSITION::ACTION for /o/g\033[0m");
      
      //::::/o/g::::Action::::
      
      // State : entry for: /o/q
      _root->MEDIUM_OBJ__STATE4_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State3->State4\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE4_OBJ.initialize();
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
/* * *  Definitions for State4 : /o/q  * * */

// User Definitions for the HFSM
//::::/o/q::::Definitions::::


void Root::State4::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State4::entry ( void ) {
  _root->log("\033[36mENTRY::State4::/o/q\033[0m");
  // Entry action for this state
  //::::/o/q::::Entry::::
  
}

void Root::State4::exit ( void ) {
  _root->log("\033[36mEXIT::State4::/o/q\033[0m");
  // Call the Exit Action for this state
  //::::/o/q::::Exit::::
  
}

void Root::State4::tick ( void ) {
  _root->log("\033[36mTICK::State4::/o/q\033[0m");
  // Call the Tick Action for this state
  //::::/o/q::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State4::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State4::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT1:
  case EventType::EVENT2:
  case EventType::EVENT3:
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
    case EventType::EVENT4:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/x\033[0m");
        // Going into a choice pseudo-state, let it handle its
        // guards and perform the state transition
        if (false) { } // makes geneeration easier :)
        //::::/o/6::::Guard::::
        else if ( _root->goToShallowHistory ) {
          _root->log("\033[37mGUARD [ _root->goToShallowHistory ] for EXTERNAL TRANSITION:/o/6 evaluated to TRUE\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        _root->log("\033[36mTRANSITION::ACTION for /o/x\033[0m");
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/6
        _root->log("\033[36mTRANSITION::ACTION for /o/6\033[0m");
        
        //::::/o/6::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: State4->State1::Shallow_History_Pseudostate\033[0m");
        
          // going into shallow history pseudo-state
          _root->MEDIUM_OBJ__STATE1_OBJ.setShallowHistory();
            // make sure nothing else handles this event
          handled = true;
          }
        //::::/o/D::::Guard::::
        else if ( _root->reInitialize ) {
          _root->log("\033[37mGUARD [ _root->reInitialize ] for EXTERNAL TRANSITION:/o/D evaluated to TRUE\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        _root->log("\033[36mTRANSITION::ACTION for /o/x\033[0m");
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/D
        _root->log("\033[36mTRANSITION::ACTION for /o/D\033[0m");
        
        //::::/o/D::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: State4->State1\033[0m");
        
          // going into regular state
          _root->MEDIUM_OBJ__STATE1_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
          }
        //::::/o/P::::Guard::::
        else if ( _root->goToDeepHistory ) {
          _root->log("\033[37mGUARD [ _root->goToDeepHistory ] for EXTERNAL TRANSITION:/o/P evaluated to TRUE\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        _root->log("\033[36mTRANSITION::ACTION for /o/x\033[0m");
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/P
        _root->log("\033[36mTRANSITION::ACTION for /o/P\033[0m");
        
        //::::/o/P::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: State4->State1::Deep_History_Pseudostate\033[0m");
        
          // going into deep history pseudo-state
          _root->MEDIUM_OBJ__STATE1_OBJ.setDeepHistory();
          // make sure nothing else handles this event
          handled = true;
          }
        else if ( true ) {
          _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/c\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        _root->log("\033[36mTRANSITION::ACTION for /o/x\033[0m");
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/c
        _root->log("\033[36mTRANSITION::ACTION for /o/c\033[0m");
        
        //::::/o/c::::Action::::
        
        _root->log("\033[31mSTATE TRANSITION: State4->End_State\033[0m");
        
          // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
          _root->MEDIUM_OBJ__END_STATE_OBJ.makeActive();
          // make sure nothing else handles this event
          handled = true;
          }
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
/* * *  Definitions for State2 : /o/y  * * */

// User Definitions for the HFSM
//::::/o/y::::Definitions::::


void Root::State2::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State2::entry ( void ) {
  _root->log("\033[36mENTRY::State2::/o/y\033[0m");
  // Entry action for this state
  //::::/o/y::::Entry::::
  
}

void Root::State2::exit ( void ) {
  _root->log("\033[36mEXIT::State2::/o/y\033[0m");
  // Call the Exit Action for this state
  //::::/o/y::::Exit::::
  
}

void Root::State2::tick ( void ) {
  _root->log("\033[36mTICK::State2::/o/y\033[0m");
  // Call the Tick Action for this state
  //::::/o/y::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State2::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT1:
  case EventType::EVENT3:
  case EventType::EVENT4:
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
    case EventType::EVENT2:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/z\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE2_OBJ.exitChildren();
      // State : exit for: /o/y
      _root->MEDIUM_OBJ__STATE2_OBJ.exit();
      // External Transition : Action for: /o/z
      _root->log("\033[36mTRANSITION::ACTION for /o/z\033[0m");
      
      //::::/o/z::::Action::::
      
      // State : entry for: /o/K
      _root->MEDIUM_OBJ__STATE3_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State2->State3\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE3_OBJ.initialize();
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
/* * *  Definitions for State1 : /o/r  * * */

// User Definitions for the HFSM
//::::/o/r::::Definitions::::


void Root::State1::initialize ( void ) {
  // External Transition : Action for: /o/r/r
  _root->log("\033[36mTRANSITION::ACTION for /o/r/r\033[0m");
  
  //::::/o/r/r::::Action::::
  
  // State : entry for: /o/r/L
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.initialize();
}

void Root::State1::entry ( void ) {
  _root->log("\033[36mENTRY::State1::/o/r\033[0m");
  // Entry action for this state
  //::::/o/r::::Entry::::
  
}

void Root::State1::exit ( void ) {
  _root->log("\033[36mEXIT::State1::/o/r\033[0m");
  // Call the Exit Action for this state
  //::::/o/r::::Exit::::
  
}

void Root::State1::tick ( void ) {
  _root->log("\033[36mTICK::State1::/o/r\033[0m");
  // Call the Tick Action for this state
  //::::/o/r::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State1::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT2:
  case EventType::EVENT3:
  case EventType::EVENT4:
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
    case EventType::EVENT1:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/M\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ.exitChildren();
      // State : exit for: /o/r
      _root->MEDIUM_OBJ__STATE1_OBJ.exit();
      // External Transition : Action for: /o/M
      _root->log("\033[36mTRANSITION::ACTION for /o/M\033[0m");
      
      //::::/o/M::::Action::::
      
      // State : entry for: /o/y
      _root->MEDIUM_OBJ__STATE2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State1->State2\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE2_OBJ.initialize();
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
/* * *  Definitions for State1::Child2 : /o/r/6  * * */

// User Definitions for the HFSM
//::::/o/r/6::::Definitions::::


void Root::State1::Child2::initialize ( void ) {
  // External Transition : Action for: /o/r/6/a
  _root->log("\033[36mTRANSITION::ACTION for /o/r/6/a\033[0m");
  
  //::::/o/r/6/a::::Action::::
  
  // State : entry for: /o/r/6/w
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.initialize();
}

void Root::State1::Child2::entry ( void ) {
  _root->log("\033[36mENTRY::State1::Child2::/o/r/6\033[0m");
  // Entry action for this state
  //::::/o/r/6::::Entry::::
  
}

void Root::State1::Child2::exit ( void ) {
  _root->log("\033[36mEXIT::State1::Child2::/o/r/6\033[0m");
  // Call the Exit Action for this state
  //::::/o/r/6::::Exit::::
  
}

void Root::State1::Child2::tick ( void ) {
  _root->log("\033[36mTICK::State1::Child2::/o/r/6\033[0m");
  // Call the Tick Action for this state
  //::::/o/r/6::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State1::Child2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT3:
  case EventType::EVENT4:
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
    case EventType::EVENT2:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/0\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.exitChildren();
      // State : exit for: /o/r/6
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.exit();
      // External Transition : Action for: /o/r/0
      _root->log("\033[36mTRANSITION::ACTION for /o/r/0\033[0m");
      
      //::::/o/r/0::::Action::::
      
      // State : entry for: /o/r/P
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State1::Child2->State1::Child3\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child2::Grand2 : /o/r/6/7  * * */

// User Definitions for the HFSM
//::::/o/r/6/7::::Definitions::::


void Root::State1::Child2::Grand2::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child2::Grand2::entry ( void ) {
  _root->log("\033[36mENTRY::State1::Child2::Grand2::/o/r/6/7\033[0m");
  // Entry action for this state
  //::::/o/r/6/7::::Entry::::
  
}

void Root::State1::Child2::Grand2::exit ( void ) {
  _root->log("\033[36mEXIT::State1::Child2::Grand2::/o/r/6/7\033[0m");
  // Call the Exit Action for this state
  //::::/o/r/6/7::::Exit::::
  
}

void Root::State1::Child2::Grand2::tick ( void ) {
  _root->log("\033[36mTICK::State1::Child2::Grand2::/o/r/6/7\033[0m");
  // Call the Tick Action for this state
  //::::/o/r/6/7::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::Grand2::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child2::Grand2::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT4:
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
    case EventType::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/6/B\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.exitChildren();
      // State : exit for: /o/r/6/7
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.exit();
      // External Transition : Action for: /o/r/6/B
      _root->log("\033[36mTRANSITION::ACTION for /o/r/6/B\033[0m");
      
      //::::/o/r/6/B::::Action::::
      
      // State : entry for: /o/r/6/w
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State1::Child2::Grand2->State1::Child2::Grand\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child2::Grand : /o/r/6/w  * * */

// User Definitions for the HFSM
//::::/o/r/6/w::::Definitions::::


void Root::State1::Child2::Grand::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child2::Grand::entry ( void ) {
  _root->log("\033[36mENTRY::State1::Child2::Grand::/o/r/6/w\033[0m");
  // Entry action for this state
  //::::/o/r/6/w::::Entry::::
  
}

void Root::State1::Child2::Grand::exit ( void ) {
  _root->log("\033[36mEXIT::State1::Child2::Grand::/o/r/6/w\033[0m");
  // Call the Exit Action for this state
  //::::/o/r/6/w::::Exit::::
  
}

void Root::State1::Child2::Grand::tick ( void ) {
  _root->log("\033[36mTICK::State1::Child2::Grand::/o/r/6/w\033[0m");
  // Call the Tick Action for this state
  //::::/o/r/6/w::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::Grand::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child2::Grand::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT4:
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
    case EventType::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/6/y\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.exitChildren();
      // State : exit for: /o/r/6/w
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.exit();
      // External Transition : Action for: /o/r/6/y
      _root->log("\033[36mTRANSITION::ACTION for /o/r/6/y\033[0m");
      
      //::::/o/r/6/y::::Action::::
      
      // State : entry for: /o/r/6/7
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State1::Child2::Grand->State1::Child2::Grand2\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child3 : /o/r/P  * * */

// User Definitions for the HFSM
//::::/o/r/P::::Definitions::::


void Root::State1::Child3::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child3::entry ( void ) {
  _root->log("\033[36mENTRY::State1::Child3::/o/r/P\033[0m");
  // Entry action for this state
  //::::/o/r/P::::Entry::::
  
}

void Root::State1::Child3::exit ( void ) {
  _root->log("\033[36mEXIT::State1::Child3::/o/r/P\033[0m");
  // Call the Exit Action for this state
  //::::/o/r/P::::Exit::::
  
}

void Root::State1::Child3::tick ( void ) {
  _root->log("\033[36mTICK::State1::Child3::/o/r/P\033[0m");
  // Call the Tick Action for this state
  //::::/o/r/P::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child3::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child3::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT2:
  case EventType::EVENT4:
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
    case EventType::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/4\033[0m");
        // Going into a choice pseudo-state, let it handle its
        // guards and perform the state transition
        if (false) { } // makes geneeration easier :)
        //::::/o/r/y::::Guard::::
        else if ( _root->cycle ) {
          _root->log("\033[37mGUARD [ _root->cycle ] for EXTERNAL TRANSITION:/o/r/y evaluated to TRUE\033[0m");
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exitChildren();
        // State : exit for: /o/r/P
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exit();
        // External Transition : Action for: /o/r/4
        _root->log("\033[36mTRANSITION::ACTION for /o/r/4\033[0m");
        
        //::::/o/r/4::::Action::::
        
        // External Transition : Action for: /o/r/y
        _root->log("\033[36mTRANSITION::ACTION for /o/r/y\033[0m");
        
        //::::/o/r/y::::Action::::
        
        // State : entry for: /o/r/L
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.entry();
        _root->log("\033[31mSTATE TRANSITION: State1::Child3->State1::Child1\033[0m");
        
          // going into regular state
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
          }
        else if ( true ) {
          _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/Z\033[0m");
          // Going into an end pseudo-state that is not the root end state,
          // follow its parent end transition
          if (false) { }
          else if ( true ) {
            _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/T\033[0m");
            // Transitioning states!
            // Call all from prev state down exits
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exitChildren();
          // State : exit for: /o/r/P
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exit();
          // State : exit for: /o/r
          _root->MEDIUM_OBJ__STATE1_OBJ.exit();
          // External Transition : Action for: /o/r/4
          _root->log("\033[36mTRANSITION::ACTION for /o/r/4\033[0m");
          
          //::::/o/r/4::::Action::::
          
          // External Transition : Action for: /o/r/Z
          _root->log("\033[36mTRANSITION::ACTION for /o/r/Z\033[0m");
          
          //::::/o/r/Z::::Action::::
          
          // External Transition : Action for: /o/T
          _root->log("\033[36mTRANSITION::ACTION for /o/T\033[0m");
          
          //::::/o/T::::Action::::
          
          _root->log("\033[31mSTATE TRANSITION: State1::Child3->End_State\033[0m");
          
            // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
            _root->MEDIUM_OBJ__END_STATE_OBJ.makeActive();
            // make sure nothing else handles this event
            handled = true;
            }
        }
      }
      break;
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
/* * *  Definitions for State1::Child1 : /o/r/L  * * */

// User Definitions for the HFSM
//::::/o/r/L::::Definitions::::


void Root::State1::Child1::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child1::entry ( void ) {
  _root->log("\033[36mENTRY::State1::Child1::/o/r/L\033[0m");
  // Entry action for this state
  //::::/o/r/L::::Entry::::
  
}

void Root::State1::Child1::exit ( void ) {
  _root->log("\033[36mEXIT::State1::Child1::/o/r/L\033[0m");
  // Call the Exit Action for this state
  //::::/o/r/L::::Exit::::
  
}

void Root::State1::Child1::tick ( void ) {
  _root->log("\033[36mTICK::State1::Child1::/o/r/L\033[0m");
  // Call the Tick Action for this state
  //::::/o/r/L::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child1::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::EVENT2:
  case EventType::EVENT3:
  case EventType::EVENT4:
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
    case EventType::EVENT1:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/o/r/G\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.exitChildren();
      // State : exit for: /o/r/L
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.exit();
      // External Transition : Action for: /o/r/G
      _root->log("\033[36mTRANSITION::ACTION for /o/r/G\033[0m");
      
      //::::/o/r/G::::Action::::
      
      // State : entry for: /o/r/6
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: State1::Child1->State1::Child2\033[0m");
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
