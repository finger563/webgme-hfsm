#include "Medium_GeneratedStates.hpp"

#ifdef DEBUG_OUTPUT
#include <iostream>
#endif

using namespace StateMachine::Medium;

// User Definitions for the HFSM
//::::/o::::Definitions::::


/* * *  Definitions for Root : /o  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
#ifdef DEBUG_OUTPUT
  std::cout << "Medium:/o HFSM Initialization" << std::endl;
#endif
  //::::/o::::Initialization::::
  
  // now set the states up properly
  // External Transition : Action for: /o/E
  #ifdef DEBUG_OUTPUT
  std::cout << "TRANSITION::ACTION for /o/E" << std::endl;
  #endif
  
  //::::/o/E::::Action::::
  
  // State : entry for: /o/r
  _root->MEDIUM_OBJ__STATE1_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ.initialize();
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
  // Get the currently active leaf state
  StateMachine::StateBase *activeLeaf = getActiveLeaf();
  if (activeLeaf != nullptr && activeLeaf != this &&
      activeLeaf == static_cast<StateBase*>(&_root->MEDIUM_OBJ__END_STATE_OBJ)) {
    reachedEnd = true;
  }
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

/* * *  Definitions for State3 : /o/K  * * */
void Root::State3::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State3::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State3::/o/K" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/K::::Entry::::
  
}

void Root::State3::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State3::/o/K" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/K::::Exit::::
  
}

void Root::State3::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State3::/o/K" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/K::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State3::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State3::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT1:
  case Event::Type::EVENT2:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/g" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE3_OBJ.exitChildren();
      // State : exit for: /o/K
      _root->MEDIUM_OBJ__STATE3_OBJ.exit();
      // External Transition : Action for: /o/g
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/g" << std::endl;
      #endif
      
      //::::/o/g::::Action::::
      
      // State : entry for: /o/q
      _root->MEDIUM_OBJ__STATE4_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State3->State4" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE4_OBJ.initialize();
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
/* * *  Definitions for State4 : /o/q  * * */
void Root::State4::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State4::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State4::/o/q" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/q::::Entry::::
  
}

void Root::State4::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State4::/o/q" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/q::::Exit::::
  
}

void Root::State4::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State4::/o/q" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/q::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State4::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State4::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT1:
  case Event::Type::EVENT2:
  case Event::Type::EVENT3:
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
    case Event::Type::EVENT4:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/x" << std::endl;
        #endif
        // Going into a choice pseudo-state, let it handle its
        // guards and perform the state transition
        if (false) { } // makes geneeration easier :)
        //::::/o/6::::Guard::::
        else if ( _root->goToShallowHistory ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "GUARD [ _root->goToShallowHistory ] for EXTERNAL TRANSITION:/o/6 evaluated to TRUE" << std::endl;
          #endif
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/x" << std::endl;
        #endif
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/6
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/6" << std::endl;
        #endif
        
        //::::/o/6::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        #ifdef DEBUG_OUTPUT
        std::cout << "STATE TRANSITION: State4->State1::Shallow_History_Pseudostate" << std::endl;
        #endif
        
          // going into shallow history pseudo-state
          _root->MEDIUM_OBJ__STATE1_OBJ.setShallowHistory();
            // make sure nothing else handles this event
          handled = true;
          }
        //::::/o/D::::Guard::::
        else if ( _root->reInitialize ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "GUARD [ _root->reInitialize ] for EXTERNAL TRANSITION:/o/D evaluated to TRUE" << std::endl;
          #endif
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/x" << std::endl;
        #endif
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/D
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/D" << std::endl;
        #endif
        
        //::::/o/D::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        #ifdef DEBUG_OUTPUT
        std::cout << "STATE TRANSITION: State4->State1" << std::endl;
        #endif
        
          // going into regular state
          _root->MEDIUM_OBJ__STATE1_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
          }
        //::::/o/P::::Guard::::
        else if ( _root->goToDeepHistory ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "GUARD [ _root->goToDeepHistory ] for EXTERNAL TRANSITION:/o/P evaluated to TRUE" << std::endl;
          #endif
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/x" << std::endl;
        #endif
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/P
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/P" << std::endl;
        #endif
        
        //::::/o/P::::Action::::
        
        // State : entry for: /o/r
        _root->MEDIUM_OBJ__STATE1_OBJ.entry();
        #ifdef DEBUG_OUTPUT
        std::cout << "STATE TRANSITION: State4->State1::Deep_History_Pseudostate" << std::endl;
        #endif
        
          // going into deep history pseudo-state
          _root->MEDIUM_OBJ__STATE1_OBJ.setDeepHistory();
          // make sure nothing else handles this event
          handled = true;
          }
        else if ( true ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/c" << std::endl;
          #endif
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE4_OBJ.exitChildren();
        // State : exit for: /o/q
        _root->MEDIUM_OBJ__STATE4_OBJ.exit();
        // External Transition : Action for: /o/x
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/x" << std::endl;
        #endif
        
        //::::/o/x::::Action::::
        
        // External Transition : Action for: /o/c
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/c" << std::endl;
        #endif
        
        //::::/o/c::::Action::::
        
        #ifdef DEBUG_OUTPUT
        std::cout << "STATE TRANSITION: State4->End_State" << std::endl;
        #endif
        
          // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
          _root->MEDIUM_OBJ__END_STATE_OBJ.makeActive();
          // make sure nothing else handles this event
          handled = true;
          }
      }
      break;
    default:
      break;
    }
  }
  // can't buble up, we are a root state.
  return handled;
}
/* * *  Definitions for State2 : /o/y  * * */
void Root::State2::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State2::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State2::/o/y" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/y::::Entry::::
  
}

void Root::State2::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State2::/o/y" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/y::::Exit::::
  
}

void Root::State2::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State2::/o/y" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/y::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State2::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State2::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT1:
  case Event::Type::EVENT3:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT2:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/z" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE2_OBJ.exitChildren();
      // State : exit for: /o/y
      _root->MEDIUM_OBJ__STATE2_OBJ.exit();
      // External Transition : Action for: /o/z
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/z" << std::endl;
      #endif
      
      //::::/o/z::::Action::::
      
      // State : entry for: /o/K
      _root->MEDIUM_OBJ__STATE3_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State2->State3" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE3_OBJ.initialize();
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
/* * *  Definitions for State1 : /o/r  * * */
void Root::State1::initialize ( void ) {
  // External Transition : Action for: /o/r/r
  #ifdef DEBUG_OUTPUT
  std::cout << "TRANSITION::ACTION for /o/r/r" << std::endl;
  #endif
  
  //::::/o/r/r::::Action::::
  
  // State : entry for: /o/r/L
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.initialize();
}

void Root::State1::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::/o/r" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r::::Entry::::
  
}

void Root::State1::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::/o/r" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r::::Exit::::
  
}

void Root::State1::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::/o/r" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State1::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT2:
  case Event::Type::EVENT3:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT1:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/M" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ.exitChildren();
      // State : exit for: /o/r
      _root->MEDIUM_OBJ__STATE1_OBJ.exit();
      // External Transition : Action for: /o/M
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/M" << std::endl;
      #endif
      
      //::::/o/M::::Action::::
      
      // State : entry for: /o/y
      _root->MEDIUM_OBJ__STATE2_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State1->State2" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE2_OBJ.initialize();
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
/* * *  Definitions for State1::Child2 : /o/r/6  * * */
void Root::State1::Child2::initialize ( void ) {
  // External Transition : Action for: /o/r/6/a
  #ifdef DEBUG_OUTPUT
  std::cout << "TRANSITION::ACTION for /o/r/6/a" << std::endl;
  #endif
  
  //::::/o/r/6/a::::Action::::
  
  // State : entry for: /o/r/6/w
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.entry();
  
  // initialize our new active state
  _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.initialize();
}

void Root::State1::Child2::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::Child2::/o/r/6" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r/6::::Entry::::
  
}

void Root::State1::Child2::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::Child2::/o/r/6" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r/6::::Exit::::
  
}

void Root::State1::Child2::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::Child2::/o/r/6" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r/6::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::getTimerPeriod ( void ) {
  return (double)(0);
}

bool Root::State1::Child2::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT3:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT2:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/0" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.exitChildren();
      // State : exit for: /o/r/6
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.exit();
      // External Transition : Action for: /o/r/0
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/r/0" << std::endl;
      #endif
      
      //::::/o/r/0::::Action::::
      
      // State : entry for: /o/r/P
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State1::Child2->State1::Child3" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child2::Grand2 : /o/r/6/7  * * */
void Root::State1::Child2::Grand2::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child2::Grand2::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::Child2::Grand2::/o/r/6/7" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r/6/7::::Entry::::
  
}

void Root::State1::Child2::Grand2::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::Child2::Grand2::/o/r/6/7" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r/6/7::::Exit::::
  
}

void Root::State1::Child2::Grand2::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::Child2::Grand2::/o/r/6/7" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r/6/7::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::Grand2::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child2::Grand2::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/6/B" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.exitChildren();
      // State : exit for: /o/r/6/7
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.exit();
      // External Transition : Action for: /o/r/6/B
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/r/6/B" << std::endl;
      #endif
      
      //::::/o/r/6/B::::Action::::
      
      // State : entry for: /o/r/6/w
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State1::Child2::Grand2->State1::Child2::Grand" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child2::Grand : /o/r/6/w  * * */
void Root::State1::Child2::Grand::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child2::Grand::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::Child2::Grand::/o/r/6/w" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r/6/w::::Entry::::
  
}

void Root::State1::Child2::Grand::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::Child2::Grand::/o/r/6/w" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r/6/w::::Exit::::
  
}

void Root::State1::Child2::Grand::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::Child2::Grand::/o/r/6/w" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r/6/w::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child2::Grand::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child2::Grand::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/6/y" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.exitChildren();
      // State : exit for: /o/r/6/w
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ.exit();
      // External Transition : Action for: /o/r/6/y
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/r/6/y" << std::endl;
      #endif
      
      //::::/o/r/6/y::::Action::::
      
      // State : entry for: /o/r/6/7
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State1::Child2::Grand->State1::Child2::Grand2" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
/* * *  Definitions for State1::Child3 : /o/r/P  * * */
void Root::State1::Child3::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child3::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::Child3::/o/r/P" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r/P::::Entry::::
  
}

void Root::State1::Child3::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::Child3::/o/r/P" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r/P::::Exit::::
  
}

void Root::State1::Child3::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::Child3::/o/r/P" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r/P::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child3::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child3::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT2:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT3:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/4" << std::endl;
        #endif
        // Going into a choice pseudo-state, let it handle its
        // guards and perform the state transition
        if (false) { } // makes geneeration easier :)
        //::::/o/r/y::::Guard::::
        else if ( _root->cycle ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "GUARD [ _root->cycle ] for EXTERNAL TRANSITION:/o/r/y evaluated to TRUE" << std::endl;
          #endif
          // Transitioning states!
          // Call all from prev state down exits
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exitChildren();
        // State : exit for: /o/r/P
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exit();
        // External Transition : Action for: /o/r/4
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/r/4" << std::endl;
        #endif
        
        //::::/o/r/4::::Action::::
        
        // External Transition : Action for: /o/r/y
        #ifdef DEBUG_OUTPUT
        std::cout << "TRANSITION::ACTION for /o/r/y" << std::endl;
        #endif
        
        //::::/o/r/y::::Action::::
        
        // State : entry for: /o/r/L
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.entry();
        #ifdef DEBUG_OUTPUT
        std::cout << "STATE TRANSITION: State1::Child3->State1::Child1" << std::endl;
        #endif
        
          // going into regular state
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.initialize();
          // make sure nothing else handles this event
          handled = true;
          }
        else if ( true ) {
          #ifdef DEBUG_OUTPUT
          std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/Z" << std::endl;
          #endif
          // Going into an end pseudo-state that is not the root end state,
          // follow its parent end transition
          if (false) { }
          else if ( true ) {
            #ifdef DEBUG_OUTPUT
            std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/T" << std::endl;
            #endif
            // Transitioning states!
            // Call all from prev state down exits
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exitChildren();
          // State : exit for: /o/r/P
          _root->MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ.exit();
          // State : exit for: /o/r
          _root->MEDIUM_OBJ__STATE1_OBJ.exit();
          // External Transition : Action for: /o/r/4
          #ifdef DEBUG_OUTPUT
          std::cout << "TRANSITION::ACTION for /o/r/4" << std::endl;
          #endif
          
          //::::/o/r/4::::Action::::
          
          // External Transition : Action for: /o/r/Z
          #ifdef DEBUG_OUTPUT
          std::cout << "TRANSITION::ACTION for /o/r/Z" << std::endl;
          #endif
          
          //::::/o/r/Z::::Action::::
          
          // External Transition : Action for: /o/T
          #ifdef DEBUG_OUTPUT
          std::cout << "TRANSITION::ACTION for /o/T" << std::endl;
          #endif
          
          //::::/o/T::::Action::::
          
          #ifdef DEBUG_OUTPUT
          std::cout << "STATE TRANSITION: State1::Child3->End_State" << std::endl;
          #endif
          
            // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
            _root->MEDIUM_OBJ__END_STATE_OBJ.makeActive();
            // make sure nothing else handles this event
            handled = true;
            }
        }
      }
      break;
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
/* * *  Definitions for State1::Child1 : /o/r/L  * * */
void Root::State1::Child1::initialize ( void ) {
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::State1::Child1::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::State1::Child1::/o/r/L" << std::endl;
  #endif
  // Entry action for this state
  //::::/o/r/L::::Entry::::
  
}

void Root::State1::Child1::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::State1::Child1::/o/r/L" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::/o/r/L::::Exit::::
  
}

void Root::State1::Child1::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::State1::Child1::/o/r/L" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::/o/r/L::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::State1::Child1::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::State1::Child1::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
  case Event::Type::EVENT2:
  case Event::Type::EVENT3:
  case Event::Type::EVENT4:
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
    case Event::Type::EVENT1:
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        #ifdef DEBUG_OUTPUT
        std::cout << "NO GUARD on EXTERNAL TRANSITION:/o/r/G" << std::endl;
        #endif
        // Transitioning states!
        // Call all from prev state down exits
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.exitChildren();
      // State : exit for: /o/r/L
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ.exit();
      // External Transition : Action for: /o/r/G
      #ifdef DEBUG_OUTPUT
      std::cout << "TRANSITION::ACTION for /o/r/G" << std::endl;
      #endif
      
      //::::/o/r/G::::Action::::
      
      // State : entry for: /o/r/6
      _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.entry();
      #ifdef DEBUG_OUTPUT
      std::cout << "STATE TRANSITION: State1::Child1->State1::Child2" << std::endl;
      #endif
      
        // going into regular state
        _root->MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
        }
      break;
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
