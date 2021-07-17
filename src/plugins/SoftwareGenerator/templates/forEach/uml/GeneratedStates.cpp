{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

#ifdef DEBUG_OUTPUT
#include <iostream>
#endif

using namespace StateMachine::{{{sanitizedName}};

// User Definitions for the HFSM
//::::{{{path}}}::::Definitions::::
{{{ Definitions }}}

/* * *  Definitions for Root : {{{path}}}  * * */
// Generated Definitions for the root state
void Root::initialize(void) {
  // Run the model's Initialization code
#ifdef DEBUG_OUTPUT
  std::cout << "{{{name}}}:{{{path}}} HFSM Initialization" << std::endl;
#endif
  //::::{{{path}}}::::Initialization::::
  {{{Initialization}}}
  // now set the states up properly
  {{> InitializeTempl}}
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
  {{#END}}
  // Get the currently active leaf state
  StateMachine::StateBase *activeLeaf = getActiveLeaf();
  if (activeLeaf != nullptr && activeLeaf != this &&
      activeLeaf == {{{pointerName}}}) {
    reachedEnd = true;
  }
  {{/END}}
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

{{#each Substates}}
{{> StateTemplCpp}}
{{~/each}}
