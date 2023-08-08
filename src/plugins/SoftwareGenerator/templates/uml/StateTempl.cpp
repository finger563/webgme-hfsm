{{#if isState}}
/* * *  Definitions for {{{fullyQualifiedName}}} : {{{path}}}  * * */

// User Definitions for the HFSM
//::::{{{path}}}::::Definitions::::
{{{ Definitions }}}

void Root::{{{fullyQualifiedName}}}::initialize ( void ) {
  {{> InitializeTempl }}
}

void Root::{{{fullyQualifiedName}}}::entry ( void ) {
  _root->log("\033[36mENTRY::{{{fullyQualifiedName}}}::{{{path}}}\033[0m");
  // Entry action for this state
  //::::{{{path}}}::::Entry::::
  {{{Entry}}}
}

void Root::{{{fullyQualifiedName}}}::exit ( void ) {
  _root->log("\033[36mEXIT::{{{fullyQualifiedName}}}::{{{path}}}\033[0m");
  // Call the Exit Action for this state
  //::::{{{path}}}::::Exit::::
  {{{Exit}}}
}

void Root::{{{fullyQualifiedName}}}::tick ( void ) {
  _root->log("\033[36mTICK::{{{fullyQualifiedName}}}::{{{path}}}\033[0m");
  // Call the Tick Action for this state
  //::::{{{path}}}::::Tick::::
  {{{Tick}}}
  if ( _activeState != nullptr && _activeState != this )
    _activeState->tick();
}

double Root::{{{fullyQualifiedName}}}::getTimerPeriod ( void ) {
  return (double)({{{this.[Timer Period]}}});
}

bool Root::{{{fullyQualifiedName}}}::handleEvent ( GeneratedEventBase* event ) {
  bool handled = false;

  // take care of all event types that this branch will not handle -
  // for more consistent run-time performnace
  switch ( event->get_type() ) {
    {{#each UnhandledEvents}}
  case EventType::{{{.}}}:
    {{/each}}
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
  {{#each InternalEvents}}
  {{> InternalEventTempl }}
  {{~/each}}
  default:
    handled = false;
    break;
  }
  if (!handled) {
    // handle external transitions here
    switch ( event->get_type() ) {
    {{#each ExternalEvents}}
    {{> ExternalEventTempl }}
    {{~/each}}
    default:
      handled = false;
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
