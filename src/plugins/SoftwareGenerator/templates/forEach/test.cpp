#include "{{{sanitizedName}}}_GeneratedStates.hpp"

#include <string>
#include <iostream>

const int numEvents        = {{{eventNames.length}}};
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    {{#eventNames}}
    "\t{{{@index}}}. {{{.}}}" << std::endl <<
    {{/eventNames}}
    "\t{{{eventNames.length}}}. None" << std::endl <<
    "\t" << TickSelection << ". HFSM Tick" << std::endl <<
    "\t" << RestartSelection << ". Restart HFSM" << std::endl <<
    "\t" << ExitSelection << ". Exit HFSM" << std::endl <<
    "selection: ";
}

int getUserSelection() {
  int s = 0;
  std::cin >> s;
  return s;
}

void makeEvent(StateMachine::{{{sanitizedName}}}::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      {{#eventNames}}
      case {{{@index}}}: {
        StateMachine::{{{../sanitizedName}}}::{{{.}}}EventData data{};
        root.spawn_{{{.}}}_event(data);
        break;
      }
      {{/eventNames}}
      default:
        break;
    }
  }
}

void handleAllEvents(StateMachine::{{{sanitizedName}}}::Root &root) {
  auto &event_factory = root.event_factory;
  std::cout << "Before: " << event_factory.to_string() << std::endl;
  root.handle_all_events();
  std::cout << "After:  " << event_factory.to_string() << std::endl;
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
      makeEvent( {{{sanitizedName}}}_root, selection );
    }
    handleAllEvents({{{sanitizedName}}}_root);
  }

  return 0;
};
