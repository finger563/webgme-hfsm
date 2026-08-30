#include "Payloads_generated_states.hpp"

using namespace state_machine;
using namespace state_machine::Payloads;

// User Definitions for the HFSM
//::::/p/m::::Definitions::::


/* * *  Definitions for Root : /p/m  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
  log("\033[36mPayloads:/p/m HFSM Initialization\033[0m");
  //::::/p/m::::Initialization::::
  pressCount = 0;
speed = 0.0f;
  // now set the states up properly
  // External Transition : Action for: /p/m/ti
  _root->log("\033[36mTRANSITION::ACTION for /p/m/ti\033[0m");
  
  //::::/p/m/ti::::Action::::
  
  // State : entry for: /p/m/Idle
  _root->PAYLOADS_OBJ__IDLE_OBJ.entry();
  
  // initialize our new active state
  _root->PAYLOADS_OBJ__IDLE_OBJ.initialize();
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
      activeLeaf == static_cast<StateBase*>(&_root->PAYLOADS_OBJ__END_OBJ)) {
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
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::Idle::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  _root->log("\033[36mENTRY::Idle::/p/m/Idle\033[0m");
  // Entry action for this state
  //::::/p/m/Idle::::Entry::::
  printf("IDLE ENTRY\n");
}

void Root::Idle::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  _root->log("\033[36mEXIT::Idle::/p/m/Idle\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/Idle::::Exit::::
      printf("IDLE EXIT\n");
}

void Root::Idle::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
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
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::CALIBRATE:
  case EventType::FINISH:
  case EventType::SET_SPEED:
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
  case EventType::BUTTON_PRESS: {
    // payload alias available to this event's guards / actions
    [[maybe_unused]] const BUTTON_PRESSEventData &data =
      static_cast<BUTTON_PRESSEvent*>(event)->get_data();
    if ( false ) {  // makes generation easier :)
    }
    //::::/p/m/Idle/it::::Guard::::
    else if ( pressCount < 1 ) {
      _root->log("\033[37mGUARD [ pressCount < 1 ] for INTERNAL TRANSITION:/p/m/Idle/it evaluated to TRUE\033[0m");
      // run transition action
      //::::/p/m/Idle/it::::Action::::
      pressCount++; printf("PRESS %d id=%d long=%d\n", pressCount, data.button_id, (int)data.long_press);
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
    case EventType::BUTTON_PRESS: {
      // payload alias available to this event's guards / actions
      [[maybe_unused]] const BUTTON_PRESSEventData &data =
        static_cast<BUTTON_PRESSEvent*>(event)->get_data();
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tGo\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->PAYLOADS_OBJ__IDLE_OBJ.exitChildren();
      // State : exit for: /p/m/Idle
      _root->PAYLOADS_OBJ__IDLE_OBJ.exit();
      // External Transition : Action for: /p/m/tGo
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tGo\033[0m");
      
      //::::/p/m/tGo::::Action::::
      printf("GO id=%d\n", data.button_id);
      // State : entry for: /p/m/Running
      _root->PAYLOADS_OBJ__RUNNING_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: Idle->Running\033[0m");
      
        // going into regular state
        _root->PAYLOADS_OBJ__RUNNING_OBJ.initialize();
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
/* * *  Definitions for Running : /p/m/Running  * * */

// User Definitions for the HFSM
//::::/p/m/Running::::Definitions::::


void Root::Running::initialize ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  // if we're a leaf state, make sure we're active
  makeActive();
}

void Root::Running::entry ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  _root->log("\033[36mENTRY::Running::/p/m/Running\033[0m");
  // Entry action for this state
  //::::/p/m/Running::::Entry::::
  printf("RUNNING ENTRY speed=%.1f\n", speed);
}

void Root::Running::exit ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  _root->log("\033[36mEXIT::Running::/p/m/Running\033[0m");
  // Call the Exit Action for this state
  //::::/p/m/Running::::Exit::::
      printf("RUNNING EXIT\n");
}

void Root::Running::tick ( void ) {
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;
  _root->log("\033[36mTICK::Running::/p/m/Running\033[0m");
  // Call the Tick Action for this state
  //::::/p/m/Running::::Tick::::
  
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::Running::getTimerPeriod ( void ) {
  return (double)(0.1);
}

bool Root::Running::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;
  // Reference aliases so guards / actions / state code can use the
  // HFSM's variables directly (equivalent to _root-> access; compiles
  // to identical code)
  [[maybe_unused]] auto &pressCount = _root->pressCount;
  [[maybe_unused]] auto &speed = _root->speed;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
  case EventType::BUTTON_PRESS:
  case EventType::CALIBRATE:
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
  case EventType::SET_SPEED: {
    // payload alias available to this event's guards / actions
    [[maybe_unused]] const SET_SPEEDEventData &data =
      static_cast<SET_SPEEDEvent*>(event)->get_data();
    if ( false ) {  // makes generation easier :)
    }
    else if (true) {
      _root->log("\033[37mNO GUARD on INTERNAL TRANSITION:/p/m/Running/it\033[0m");
      // run transition action
      //::::/p/m/Running/it::::Action::::
      speed = data.speed; printf("SPEED %.1f\n", speed);
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
    case EventType::STOP: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tStop\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->PAYLOADS_OBJ__RUNNING_OBJ.exitChildren();
      // State : exit for: /p/m/Running
      _root->PAYLOADS_OBJ__RUNNING_OBJ.exit();
      // External Transition : Action for: /p/m/tStop
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tStop\033[0m");
      
      //::::/p/m/tStop::::Action::::
      
      // State : entry for: /p/m/Idle
      _root->PAYLOADS_OBJ__IDLE_OBJ.entry();
      _root->log("\033[31mSTATE TRANSITION: Running->Idle\033[0m");
      
        // going into regular state
        _root->PAYLOADS_OBJ__IDLE_OBJ.initialize();
        // make sure nothing else handles this event
        handled = true;
      }
      break;
    }
    case EventType::FINISH: {
      if ( false ) { }  // makes generation easier :)
      else if ( true ) {
        _root->log("\033[37mNO GUARD on EXTERNAL TRANSITION:/p/m/tFin\033[0m");
        // Transitioning states!
        // Call all from prev state down exits
      _root->PAYLOADS_OBJ__RUNNING_OBJ.exitChildren();
      // State : exit for: /p/m/Running
      _root->PAYLOADS_OBJ__RUNNING_OBJ.exit();
      // External Transition : Action for: /p/m/tFin
      _root->log("\033[36mTRANSITION::ACTION for /p/m/tFin\033[0m");
      
      //::::/p/m/tFin::::Action::::
      
      _root->log("\033[31mSTATE TRANSITION: Running->End\033[0m");
      
        // going into end pseudo-state THIS SHOULD BE TOP LEVEL END STATE
        _root->PAYLOADS_OBJ__END_OBJ.makeActive();
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
