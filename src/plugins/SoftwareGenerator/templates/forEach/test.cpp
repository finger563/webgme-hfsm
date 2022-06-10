#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <string>
#include <iostream>

const int numEvents        = {{{eventNames.length}}};
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

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
    switch (eventIndex) {
      {{#eventNames}}
      case {{{@index}}}: {
        StateMachine::{{{../sanitizedName}}}::{{{.}}}EventData data{};
        eventFactory.spawn_{{{.}}}_event(data);
        break;
      }
      {{/eventNames}}
      default:
        break;
    }
  }
}

void handleAllEvents(StateMachine::{{{sanitizedName}}}::Root &root) {
  auto &eventFactory = root.eventFactory;
  std::cout << eventFactory.to_string() << std::endl;
  StateMachine::{{{sanitizedName}}}::GeneratedEventBase* e = eventFactory.getNextEvent();
  while (e != nullptr) {
    bool handled = root.handleEvent( e );
    // log whether we handled the event or not
    if (handled) {
      std::cout << "Handled " << e->to_string() << std::endl;
    }
    else {
      std::cout << "Did not handle " << e->to_string() << std::endl;
    }
    // free the memory that was allocated during "spawnEvent"
    eventFactory.consumeEvent( e );
    // now get the next event
    e = eventFactory.getNextEvent();
    // print the events currently in the queue
    std::cout << eventFactory.to_string() << std::endl;
  }
}

int main( int argc, char** argv ) {

  StateMachine::{{{sanitizedName}}}::GeneratedEventBase* e = nullptr;
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
