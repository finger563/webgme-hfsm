{{#if isState}}

/**
 * Definitions for {{{fullyQualifiedName}}} : {{{path}}}
 */

void {{{fullyQualifiedName}}}::entry ( void ) {
  // Entry action for this state
  {{{Entry}}}
}

void {{{fullyQualifiedName}}}::exit ( void ) {
  // Call the Exit Action for this state
  {{{Exit}}}
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
  {{#if parent.isRoot}}
  // can't buble up, we are a root state.
  {{else}}
  if (!handled) {
    // now check parent states
    handled = _parentState->handleEvent( event );
  }
  {{/if}}
  return handled;
}

StateMachine::StateBase* {{{fullyQualifiedName}}}::getInitial ( void ) {
  return {{> InitialStateTempl this}};
}

void {{{fullyQualifiedName}}}::runChildInitTransAction ( void ) {
{{#if Initial_list}}{{{Initial_list.[0].ExternalTransitions.[0].Action}}}{{/if}}
}
{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}
{{else if isRoot}}

/**
 * Definitions for {{{fullyQualifiedName}}} : {{{path}}}
 */

void {{{fullyQualifiedName}}}::entry ( void ) {
  // Entry action for this state
  {{{Entry}}}
}

void {{{fullyQualifiedName}}}::exit ( void ) {
  // Call the Exit Action for this state
  {{{Exit}}}
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

  // have the active leaf handle the event, this will bubble up until
  // the event is handled or it reaches the root.
  handled = activeLeaf->handleEvent( event );

  return handled;
}

StateMachine::StateBase* {{{fullyQualifiedName}}}::getInitial ( void ) {
  return {{> InitialStateTempl this}};
}

void {{{fullyQualifiedName}}}::runChildInitTransAction ( void ) {
{{#if Initial_list}}{{{Initial_list.[0].ExternalTransitions.[0].Action}}}{{/if}}
}
{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}
{{~/if}}
