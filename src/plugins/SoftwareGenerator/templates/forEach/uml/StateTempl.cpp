{{#if isState}}
/* * *  Definitions for {{{fullyQualifiedName}}} : {{{path}}}  * * */

// User Definitions for the HFSM
//::::{{{path}}}::::Definitions::::
{{{ Definitions }}}

void Root::{{{fullyQualifiedName}}}::initialize ( void ) {
  {{> InitializeTempl }}
}

void Root::{{{fullyQualifiedName}}}::entry ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "ENTRY::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Entry action for this state
  //::::{{{path}}}::::Entry::::
  {{{Entry}}}
}

void Root::{{{fullyQualifiedName}}}::exit ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "EXIT::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Call the Exit Action for this state
  //::::{{{path}}}::::Exit::::
  {{{Exit}}}
}

void Root::{{{fullyQualifiedName}}}::tick ( void ) {
  #ifdef DEBUG_OUTPUT
  std::cout << "TICK::{{{fullyQualifiedName}}}::{{{path}}}" << std::endl;
  #endif
  // Call the Tick Action for this state
  //::::{{{path}}}::::Tick::::
  {{{Tick}}}
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::{{{fullyQualifiedName}}}::getTimerPeriod ( void ) {
  return (double)({{{this.[Timer Period]}}});
}

bool Root::{{{fullyQualifiedName}}}::handleEvent ( Event* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->type() ) {
    {{#each UnhandledEvents}}
  case Event::Type::{{{.}}}:
    {{/each}}
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
{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}
{{~/if}}
