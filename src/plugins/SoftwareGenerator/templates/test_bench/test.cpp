#include <iostream>
#include <string>
#include <thread>

#include "{{{sanitizedName}}}_generated_states.hpp"

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

void makeEvent({{{namespace}}}::{{{sanitizedName}}}::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      {{#eventNames}}
      case {{{@index}}}: {
        {{{../namespace}}}::{{{../sanitizedName}}}::{{{.}}}EventData data{};
        root.spawn_{{{.}}}_event(data);
        break;
      }
      {{/eventNames}}
      default:
        break;
    }
  }
}

int main( int argc, char** argv ) {

  {{{namespace}}}::{{{sanitizedName}}}::GeneratedEventBase* e = nullptr;
  bool handled = false;

  // create the HFSM
  {{{namespace}}}::{{{sanitizedName}}}::Root {{{sanitizedName}}}_root;

  #if DEBUG_OUTPUT
  {{{sanitizedName}}}_root.set_log_callback([](std::string_view msg) {
    std::cout << msg << std::endl;
  });
  #endif

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
    {{{sanitizedName}}}_root.handle_all_events();
  }

  return 0;
};
