#include "{{{sanitizedName}}}_Events.hpp"
{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

#ifdef DEBUG_OUTPUT
#include <iostream>
#endif

namespace StateMachine {
  {{> PointerTemplCpp this}}
  {{#END}}
  StateMachine::StateBase         {{{pointerName}}}_stateObj{{#if parent.pointerName}}( {{{parent.pointerName}}} ){{/if}};
  StateMachine::StateBase *const  {{{pointerName}}} = &{{{pointerName}}}_stateObj;
  {{~/END}}

  // User Definitions for the HFSM
  {{{Definitions}}}

  /* * *  Definitions for {{{sanitizedName}}} : {{{path}}}  * * */
  // Generated Definitions for the root state
  void {{{fullyQualifiedName}}}::initialize ( void ) {
    // Run the model's Initialization code
    {{{Initialization}}}
    // run init transition action for HFSM root
    runChildInitTransAction();
    // set initial states
    setShallowHistory();
  };
  
  void {{{fullyQualifiedName}}}::terminate ( void ) {
    StateMachine::StateBase* exitingState = getActiveLeaf();
    while ( exitingState != nullptr && exitingState != this ) {
      // call the exit action on the state
      exitingState->exit();
      exitingState = exitingState->getParentState();
    }
  };
  
  void {{{fullyQualifiedName}}}::restart ( void ) {
    terminate();
    initialize();
  };
  
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
};

// Root of the HFSM
StateMachine::{{{sanitizedName}}} *const {{{sanitizedName}}}_root = &StateMachine::{{{pointerName}}}_stateObj;
// Event Factory
StateMachine::EventFactory EVENT_FACTORY;
StateMachine::EventFactory *const eventFactory = &EVENT_FACTORY;

