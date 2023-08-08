#include "Medium_generated_states.hpp"

#include <iostream>
#include <string>
#include <thread>

const int numEvents        = 4;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. EVENT1" << std::endl <<
    "\t1. EVENT2" << std::endl <<
    "\t2. EVENT3" << std::endl <<
    "\t3. EVENT4" << std::endl <<
    "\t4. None" << std::endl <<
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

void makeEvent(state_machine::Medium::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Medium::EVENT1EventData data{};
        root.spawn_EVENT1_event(data);
        break;
      }
      case 1: {
        state_machine::Medium::EVENT2EventData data{};
        root.spawn_EVENT2_event(data);
        break;
      }
      case 2: {
        state_machine::Medium::EVENT3EventData data{};
        root.spawn_EVENT3_event(data);
        break;
      }
      case 3: {
        state_machine::Medium::EVENT4EventData data{};
        root.spawn_EVENT4_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( int argc, char** argv ) {

  state_machine::Medium::GeneratedEventBase* e = nullptr;
  bool handled = false;

  // create the HFSM
  state_machine::Medium::Root Medium_root;

  #if DEBUG_OUTPUT
  Medium_root.set_log_callback([](std::string_view msg) {
    std::cout << msg << std::endl;
  });
  #endif

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
      makeEvent( Medium_root, selection );
    }
    Medium_root.handle_all_events();
  }

  return 0;
};
