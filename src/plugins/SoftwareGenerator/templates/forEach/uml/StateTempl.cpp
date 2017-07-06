{{#isChoice}}
bool {{{fullyQualifiedName}}}::handleChoice ( StateMachine::StateBase* activeLeaf ) {
  bool handled = false;
  // We are going into a choice state, need to make sure we
  // check all the outgoing transitions' guards and decide
  // which state to go into, and run all the proper Actions,
  // exit()s and entry()s.

  if ( false ) { } // just to have easier code generation :)
  {{#ExternalEvents}}
  {{> ExternalEventTempl }}
  {{/ExternalEvents}}
  return handled;
}
{{/isChoice}}
{{#isState}}
/**
 * Definitions for class {{{fullyQualifiedName}}}
 */

void {{{fullyQualifiedName}}}::entry ( void ) {
  // Now call the Entry action for this state
  {{{Entry}}}
  // Now call the entry function down the active branch to the leaf
  if ( _activeState )
    _activeState->entry();
}

void {{{fullyQualifiedName}}}::exit ( void ) {
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

void {{{fullyQualifiedName}}}::tick ( void ) {
  {{{Tick}}}
  if ( _activeState )
    _activeState->tick();
}

bool {{{fullyQualifiedName}}}::handleEvent ( StateMachine::Event* event ) {
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

StateMachine::StateBase* {{{fullyQualifiedName}}}::getInitial ( void ) {
  return {{{getInitial()}}};
}

{{#Substates}}
{{> StateTemplCpp }}
{{/Substates}}
{{/isState}}

