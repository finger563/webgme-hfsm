{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

using namespace StateMachine::{{{sanitizedName}}};

// User Definitions for the HFSM
//::::{{{path}}}::::Definitions::::
{{{ Definitions }}}

/* * *  Definitions for Root : {{{path}}}  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
#ifdef DEBUG_OUTPUT
  std::cout << "\033[36m{{{name}}}:{{{path}}} HFSM Initialization\033[0m" << std::endl;
#endif
  //::::{{{path}}}::::Initialization::::
  {{{Initialization}}}
  // now set the states up properly
  {{> InitializeTempl}}
};

void Root::handle_all_events(void) {
  GeneratedEventBase* e;
  // get the next event and check if it's nullptr
  while ((e = event_factory.get_next_event())) {
    [[maybe_unused]] bool did_handle = handleEvent( e );
#ifdef DEBUG_OUTPUT
    std::cout << "\033[0mHANDLED " <<
      e->to_string() << ": " <<
      (did_handle ? "\033[32mtrue" : "\033[31mfalse") <<
      "\033[0m" <<
      std::endl;
#endif
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
  {{#END}}
  // Get the currently active leaf state
  StateMachine::StateBase *activeLeaf = getActiveLeaf();
  if (activeLeaf != nullptr && activeLeaf != this &&
      activeLeaf == static_cast<StateBase*>(&_root->{{{pointerName}}})) {
    reachedEnd = true;
  }
  {{/END}}
  return reachedEnd;
};

bool Root::handleEvent(GeneratedEventBase *event) {
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

{{#each Substates}}
{{> StateTemplCpp}}
{{~/each}}
