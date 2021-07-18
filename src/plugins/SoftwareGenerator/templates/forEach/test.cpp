#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <string>
#include <iostream>

const int numEvents        = {{{eventNames.length}}};
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

StateMachine::{{{sanitizedName}}}::Event::Type eventTypes[] = {
  {{#eventNames}}
  StateMachine::{{{../sanitizedName}}}::Event::Type::{{{.}}},
  {{/eventNames}}
};

void displayEventMenu() {
  std::cout << "Select which event to spawn:" << std::endl <<
    {{#eventNames}}
    "{{{@index}}}. {{{.}}}" << std::endl <<
    {{/eventNames}}
    "{{{eventNames.length}}}. None" << std::endl <<
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

void makeEvent(StateMachine::{{{sanitizedName}}}::EventFactory& eventFactory, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    eventFactory.spawnEvent( eventTypes[ eventIndex ] );
  }
}

void handleAllEvents(StateMachine::{{{sanitizedName}}}::Root &root) {
  auto &eventFactory = root.eventFactory;
#if DEBUG_OUTPUT
  std::cout << eventFactory.toString() << std::endl;
#endif
  StateMachine::{{{sanitizedName}}}::Event* e = eventFactory.getNextEvent();
  while (e != nullptr) {
    bool handled = root.handleEvent( e );
    // log whether we handled the event or not
    if (handled) {
#if DEBUG_OUTPUT
      std::cout << "Handled " << StateMachine::{{{sanitizedName}}}::Event::toString( e ) << std::endl;
#else
      std::cout << "Handled event." << std::endl;
#endif
    }
    else {
#if DEBUG_OUTPUT
      std::cout << "Did not handle " << StateMachine::{{{sanitizedName}}}::Event::toString( e ) << std::endl;
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

  StateMachine::{{{sanitizedName}}}::Event* e = nullptr;
  bool handled = false;

  // create the HFSM
  StateMachine::{{{sanitizedName}}}::Root {{{sanitizedName}}}_root;

  // initialize the HFSM
  {{{sanitizedName}}}_root.initialize();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      break;
    }
    else if (selection == RestartSelection) {
      {{{sanitizedName}}}_root.restart();
    }
    else if (selection == TickSelection) {
      {{{sanitizedName}}}_root.tick();
    }
    else {
      makeEvent( {{{sanitizedName}}}_root.eventFactory, selection );
    }
    handleAllEvents({{{sanitizedName}}}_root);
  }

  return 0;
};
