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
    {{#InternalTransitions}}
  case {{{Event}}}:
  if ( {{{Guard}}} ) {
    // run transition action
    {{{Action}}}
    // make sure nothing else handles this event
    handled = true;
  }
  break;
  {{/InternalTransitions}}
  default:
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->type() ) {
      {{#ExternalTransitions}}
    case {{{Event}}}:
    if ( {{{Guard}}} ) {
      {{#finalState.isChoice}}
      // Going into a choice pseudo-state, let it handle its
      // guards and perform the state transition
      handled = {{{finalState.VariableName}}}->handleChoice();
      {{/finalState.isChoice}}
      {{^finalState.isChoice}}
      // We are going into either a regular state, deep history
      // state, or a shallow history state, just need to make
      // the right state active, run the exit()s, Action, and
      // entry()s

      // set the new active state
      {{{finalState.VariableName}}}->makeActive();
      // call the exit() function for the old state
      {{{originalState.VariableName}}}->exit();
      // run the transition function (s)
      {{{trans.transitionFunc}}}
      // call the entry() function for the new branch from the
      // common parent's new active child
      {{{newBranchState}}}->entry();
      // make sure nothing else handles this event
      handled = true;
      {{/finalState.isChoice}}
    }
    break;
    {{/ExternalTransitions}}
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
