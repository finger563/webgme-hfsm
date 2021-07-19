#include "Simple_GeneratedStates.hpp"

#include <string>
#include <iostream>

const int numEvents        = 1;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

StateMachine::Simple::Event::Type eventTypes[] = {
  StateMachine::Simple::Event::Type::INPUTEVENT,
};

void displayEventMenu() {
  std::cout << "Select which event to spawn:" << std::endl <<
    "0. INPUTEVENT" << std::endl <<
    "1. None" << std::endl <<
    TickSelection << ". HFSM Tick" << std::endl <<
    RestartSelection << ". Restart HFSM" << std::endl <<
    ExitSelection << ". Exit HFSM" << std::endl <<
    "selection: ";
}

int getUserSelection() {
  int s = 0;
  std::cin >> s;
  return s;
}

void makeEvent(StateMachine::Simple::EventFactory& eventFactory, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    eventFactory.spawnEvent( eventTypes[ eventIndex ] );
  }
}

void handleAllEvents(StateMachine::Simple::Root &root) {
  auto &eventFactory = root.eventFactory;
#if DEBUG_OUTPUT
  std::cout << eventFactory.toString() << std::endl;
#endif
  StateMachine::Simple::Event* e = eventFactory.getNextEvent();
  while (e != nullptr) {
    bool handled = root.handleEvent( e );
    // log whether we handled the event or not
    if (handled) {
#if DEBUG_OUTPUT
      std::cout << "Handled " << StateMachine::Simple::Event::toString( e ) << std::endl;
#else
      std::cout << "Handled event." << std::endl;
#endif
    }
    else {
#if DEBUG_OUTPUT
      std::cout << "Did not handle " << StateMachine::Simple::Event::toString( e ) << std::endl;
#else
      std::cout << "Did not handle event." << std::endl;
#endif
    }
    // free the memory that was allocated during "spawnEvent"
    eventFactory.consumeEvent( e );
    // now get the next event
    e = eventFactory.getNextEvent();
#if DEBUG_OUTPUT
    // print the events currently in the queue
    std::cout << eventFactory.toString() << std::endl;
#endif
  }
}

int main( int argc, char** argv ) {

  StateMachine::Simple::Event* e = nullptr;
  bool handled = false;

  // create the HFSM
  StateMachine::Simple::Root Simple_root;

  // initialize the HFSM
  Simple_root.initialize();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      break;
    }
    else if (selection == RestartSelection) {
      Simple_root.restart();
    }
    else if (selection == TickSelection) {
      Simple_root.tick();
    }
    else {
      makeEvent( Simple_root.eventFactory, selection );
    }
    handleAllEvents(Simple_root);
  }

  return 0;
};
