/**
 * Definitions for class {{{name}}}
 */

void {{{name}}}::entry ( void ) {
  // Now call the Entry action for this state
  {{{Entry}}}
  // Now call the entry function down the active branch to the leaf
  if ( _activeState )
    _activeState->entry();
}

void {{{name}}}::exit ( void ) {
  if ( _parentState && _parentState->getActive() != this ) {
    // we are no longer the active state of the parent
    {{{Exit}}}
    _parentState->exit();
  }
  else if ( _parentState == nullptr ) {
    // we are a top level state, just call exit
    {{{Exit}}}
  }
}

void {{{name}}}::tick ( void ) {
  {{{Tick}}}
  if ( _activeState )
    _activeState->tick();
}

bool {{{name}}}::handleEvent ( StateMachine::Event* event ) {
  bool handled = false;

  // Get the currently active leaf state
  StateMachine::StateBase* activeLeaf = getActiveLeaf();

  // handle internal transitions first
  switch ( event->type() ) {
  {{#InternalEvents}}
  {{> InternalEventTempl }}
  {{/InternalEvents}}
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
    {{#ExternalEvents}}
    {{> ExternalEventTempl }}
    {{/ExternalEvents}}
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

StateMachine::StateBase* {{{name}}}::getInitial ( void ) {
  return {{{getInitial()}}};
}

{{#State_list}}
{{> StateTemplCpp }}
{{/State_list}}
