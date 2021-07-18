#include "Medium_GeneratedStates.hpp"

#include <string>
#include <iostream>

const int numEvents        = 4;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

StateMachine::Medium::Event::Type eventTypes[] = {
  StateMachine::Medium::Event::Type::EVENT1,
  StateMachine::Medium::Event::Type::EVENT2,
  StateMachine::Medium::Event::Type::EVENT3,
  StateMachine::Medium::Event::Type::EVENT4,
};

void displayEventMenu() {
  std::cout << "Select which event to spawn:" << std::endl <<
    "0. EVENT1" << std::endl <<
    "1. EVENT2" << std::endl <<
    "2. EVENT3" << std::endl <<
    "3. EVENT4" << std::endl <<
    "4. None" << std::endl <<
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

void makeEvent(StateMachine::Medium::EventFactory& eventFactory, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    eventFactory.spawnEvent( eventTypes[ eventIndex ] );
  }
}

void handleAllEvents(StateMachine::Medium::Root &root) {
  auto &eventFactory = root.eventFactory;
#if DEBUG_OUTPUT
  std::cout << eventFactory.toString() << std::endl;
#endif
  StateMachine::Medium::Event* e = eventFactory.getNextEvent();
  while (e != nullptr) {
    bool handled = root.handleEvent( e );
    // log whether we handled the event or not
    if (handled) {
#if DEBUG_OUTPUT
      std::cout << "Handled " << StateMachine::Medium::Event::toString( e ) << std::endl;
#else
      std::cout << "Handled event." << std::endl;
#endif
    }
    else {
#if DEBUG_OUTPUT
      std::cout << "Did not handle " << StateMachine::Medium::Event::toString( e ) << std::endl;
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

  StateMachine::Medium::Event* e = nullptr;
  bool handled = false;

  // create the HFSM
  StateMachine::Medium::Root Medium_root;

  // initialize the HFSM
  Medium_root.initialize();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      break;
    }
    else if (selection == RestartSelection) {
      Medium_root.restart();
    }
    else if (selection == TickSelection) {
      Medium_root.tick();
    }
    else {
      makeEvent( Medium_root.eventFactory, selection );
    }
    handleAllEvents(Medium_root);
  }

  return 0;
};
