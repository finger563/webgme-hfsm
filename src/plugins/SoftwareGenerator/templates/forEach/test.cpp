#include "Events.hpp"
#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <iostream>

int main( int argc, char** argv ) {

  StateMachine::EventFactory EF;

  {{#parent.eventNames}}
  EF.spawnEvent( StateMachine::Event::Type::{{{.}}} );
  {{/parent.eventNames}}

  StateMachine::Event* e = EF.getNextEvent();

  // set initial states
  root->setShallowHistory();
  // run initial transition and entry actions
  root->initShallowHistory();

  do {
    bool handled = root->handleEvent( e );
    if (handled) {
      std::cout << "Handled " << StateMachine::Event::toString( e ) << std::endl;
    }
    else {
      std::cout << "Did not handle " << StateMachine::Event::toString( e ) << std::endl;
    }
    EF.consumeEvent( e );
    e = EF.getNextEvent();
  } while (e != nullptr);
  
  return 0;
};
