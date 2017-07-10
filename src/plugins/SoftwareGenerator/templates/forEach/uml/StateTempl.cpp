{{#if isState}}

/**
 * Definitions for {{{fullyQualifiedName}}} : {{{path}}}
 */

void {{{fullyQualifiedName}}}::entry ( void ) {
  // Now call the Entry action for this state
  {{{Entry}}}
  // Now call the entry function down the active branch to the leaf
  if ( _activeState )
    _activeState->entry();
}

StateMachine::StateBase* {{{fullyQualifiedName}}}::exit ( void ) {
  StateMachine::StateBase* commonRoot = nullptr;
  if ( _parentState && _parentState->getActive() != this ) {
    // we are no longer the active state of the parent run the exit
    // action, then call the parent's exit function
    {{{Exit}}}
    commonRoot = _parentState->exit();
  }
  else if ( _parentState == nullptr ) {
    // we are a top level state, just run the exit action
    {{{Exit}}}
  }
  else {
    // we are not top level, but we are already active
    if (_activeState != nullptr)
      commonRoot = _activeState;
    else
      commonRoot = this;
  }
  return commonRoot;
}

void {{{fullyQualifiedName}}}::tick ( void ) {
  {{{Tick}}}
  if ( _activeState )
    _activeState->tick();
}

bool {{{fullyQualifiedName}}}::handleEvent ( StateMachine::Event* event ) {
  bool handled = false;

  // Get the currently active leaf state
  StateMachine::StateBase* activeLeaf = getActiveLeaf();

  // Get the currently active leaf state
  StateMachine::StateBase* newBranchRoot = nullptr;

  // handle internal transitions first
  switch ( event->type() ) {
  {{#each InternalEvents}}
  {{> InternalEventTempl }}
  {{~/each}}
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
    {{#each ExternalEvents}}
    {{> ExternalEventTempl }}
    {{~/each}}
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

StateMachine::StateBase* {{{fullyQualifiedName}}}::getInitial ( void ) {
  return {{> InitialStateTempl this}};
}
{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}
{{~/if}}
