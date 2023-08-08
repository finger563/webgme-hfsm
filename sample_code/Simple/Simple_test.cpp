#include "Simple_generated_states.hpp"

#include <iostream>
#include <string>
#include <thread>

const int numEvents        = 1;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. INPUTEVENT" << std::endl <<
    "\t1. None" << std::endl <<
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

void makeEvent(state_machine::Simple::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Simple::INPUTEVENTEventData data{};
        root.spawn_INPUTEVENT_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( int argc, char** argv ) {

  state_machine::Simple::GeneratedEventBase* e = nullptr;
  bool handled = false;

  // create the HFSM
  state_machine::Simple::Root Simple_root;

  #if DEBUG_OUTPUT
  Simple_root.set_log_callback([](std::string_view msg) {
    std::cout << msg << std::endl;
  });
  #endif

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
      makeEvent( Simple_root, selection );
    }
    Simple_root.handle_all_events();
  }

  return 0;
};
