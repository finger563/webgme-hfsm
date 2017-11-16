#include "{{{sanitizedName}}}_Events.hpp"
#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <string>
#include <iostream>

void displayEventMenu() {
  std::cout << "Select which event to spawn:" << std::endl <<
  {{#eventNames}}
  "{{{@index}}}. {{{.}}}" << std::endl <<
  {{/eventNames}}
  "{{{eventNames.length}}}. None" << std::endl
					 << "selection: ";
}

int getUserSelection() {
  int s = 0;
  std::cin >> s;
  return s;
}

// Provides menu to the user to select which event to spawn.
StateMachine::Event* makeEvent() {
  StateMachine::Event* e = nullptr;
  StateMachine::Event::Type types[] = {
    {{#eventNames}}
    StateMachine::Event::Type::{{{.}}},
    {{/eventNames}}
  };
  displayEventMenu();
  int i = getUserSelection();
  if ( i < {{{eventNames.length}}} && i > -1 ) {
    eventFactory->spawnEvent( types[ i ] );

    #ifdef DEBUG_OUTPUT
    std::cout << eventFactory->toString() << std::endl;
    #endif

    e = eventFactory->getNextEvent();
  }
  return e;
}

int main( int argc, char** argv ) {

  StateMachine::Event* e = nullptr;

  // initialize the HFSM
  {{{sanitizedName}}}_root->initialize();
  
  while ( (e = makeEvent()) != nullptr) {
    bool handled = {{{sanitizedName}}}_root->handleEvent( e );
    if (handled) {
      #ifdef DEBUG_OUTPUT
      std::cout << "Handled " << StateMachine::Event::toString( e ) << std::endl;
      #else
      std::cout << "Handled event\n";
      #endif
    }
    else {
      #ifdef DEBUG_OUTPUT
      std::cout << "Did not handle " << StateMachine::Event::toString( e ) << std::endl;
      #else
      std::cout << "Did not handle event.\n";
      #endif
    }
    eventFactory->consumeEvent( e );
  } 
  
  return 0;
};
