#include "Events.hpp"
{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

{{#if parent.DEBUG_OUTPUT}}
#define DEBUG_OUTPUT
#include <iostream>
{{/if}}

namespace StateMachine {
  {{> PointerTemplCpp this}}
  {{#END}}
  StateMachine::StateBase         {{{pointerName}}}_stateObj;
  StateMachine::StateBase *const  {{{pointerName}}} = &{{{pointerName}}}_stateObj;
  {{~/END}}

  // Definitions for the root state
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
};

// Root of the HFSM
StateMachine::StateBase *const root = &StateMachine::{{{pointerName}}}_stateObj;
// Event Factory
StateMachine::EventFactory EVENT_FACTORY;
StateMachine::EventFactory *const eventFactory = &EVENT_FACTORY;

