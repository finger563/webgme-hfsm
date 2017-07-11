#include "Events.hpp"
#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <iostream>

void displayEventMenu() {
  std::cout << "Select which event to spawn:" << std::endl <<
  {{#parent.eventNames}}
  "{{{@index}}}. {{{.}}}" << std::endl <<
  {{/parent.eventNames}}
  "{{{parent.eventNames.length}}}. None" << std::endl
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
    {{#parent.eventNames}}
    StateMachine::Event::Type::{{{.}}},
    {{/parent.eventNames}}
  };
  displayEventMenu();
  int i = getUserSelection();
  if ( i < {{{parent.eventNames.length}}} && i > -1 ) {
    eventFactory->spawnEvent( types[ i ] );
    e = eventFactory->getNextEvent();
  }
  return e;
}

int main( int argc, char** argv ) {

  StateMachine::Event* e = nullptr;

  // run init transition action for HFSM root
  root->runChildInitTransAction();
  // set initial states
  root->setShallowHistory();

  e = makeEvent();

  while (e != nullptr) {
    bool handled = root->handleEvent( e );
    if (handled) {
      std::cout << "Handled " << StateMachine::Event::toString( e ) << std::endl;
    }
    else {
      std::cout << "Did not handle " << StateMachine::Event::toString( e ) << std::endl;
    }
    eventFactory->consumeEvent( e );
    e = makeEvent();
  } 
  
  return 0;
};
