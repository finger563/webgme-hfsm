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
  //::::{{{path}}}::::Definitions::::
  {{{Definitions}}}

  /* * *  Definitions for {{{sanitizedName}}} : {{{path}}}  * * */
  // Generated Definitions for the root state
  void {{{fullyQualifiedName}}}::initialize ( void ) {
    // Run the model's Initialization code
    #ifdef DEBUG_OUTPUT
    std::cout << "HFSM Initialization" << std::endl;
    #endif
    //::::{{{path}}}::::Initialization::::
    {{{Initialization}}}
    // now set the states up properly
    {{> InitializeTempl }}
  };
  
  void {{{fullyQualifiedName}}}::terminate ( void ) {
    // will call exit() and exitChildren() on _activeState if it
    // exists
    exitChildren();
  };
  
  void {{{fullyQualifiedName}}}::restart ( void ) {
    terminate();
    initialize();
  };
  
  bool {{{fullyQualifiedName}}}::handleEvent ( StateMachine::Event* event ) {
    bool handled = false;

    // Get the currently active leaf state
    StateMachine::StateBase* activeLeaf = getActiveLeaf();

    if (activeLeaf != nullptr && activeLeaf != this) {
      // have the active leaf handle the event, this will bubble up until
      // the event is handled or it reaches the root.
      handled = activeLeaf->handleEvent( event );
    }

    return handled;
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

