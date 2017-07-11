{{#if isState}}
/* * *  Definitions for {{{fullyQualifiedName}}} : {{{path}}}  * * */
void {{{fullyQualifiedName}}}::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Entry action for this state
  {{{Entry}}}
}

void {{{fullyQualifiedName}}}::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Call the Exit Action for this state
  {{{Exit}}}
}

void {{{fullyQualifiedName}}}::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Call the Tick Action for this state
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
  {{#if Initial_list}}
  return {{{Initial_list.[0].ExternalTransitions.[0].nextState.pointerName}}};
  {{else}}
  return this;
  {{/if}}
}

void {{{fullyQualifiedName}}}::runChildInitTransAction ( void ) {
  {{#if Initial_list}}
  #ifdef DEBUG_OUTPUT
  std::cout << "INITIAL TRANSITION::ACTION for {{{Initial_list.[0].ExternalTransitions.[0].path}}}" << std::endl;
  #endif
  {{{Initial_list.[0].ExternalTransitions.[0].Action}}}
  {{/if}}
}
{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}
{{~/if}}
