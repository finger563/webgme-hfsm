#include "Complex_generated_states.hpp"

#include <iostream>
#include <string>
#include <thread>

const int numEvents        = 5;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. ENDEVENT" << std::endl <<
    "\t1. EVENT1" << std::endl <<
    "\t2. EVENT2" << std::endl <<
    "\t3. EVENT3" << std::endl <<
    "\t4. EVENT4" << std::endl <<
    "\t5. None" << std::endl <<
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

void makeEvent(state_machine::Complex::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Complex::ENDEVENTEventData data{};
        root.spawn_ENDEVENT_event(data);
        break;
      }
      case 1: {
        state_machine::Complex::EVENT1EventData data{};
        root.spawn_EVENT1_event(data);
        break;
      }
      case 2: {
        state_machine::Complex::EVENT2EventData data{};
        root.spawn_EVENT2_event(data);
        break;
      }
      case 3: {
        state_machine::Complex::EVENT3EventData data{};
        root.spawn_EVENT3_event(data);
        break;
      }
      case 4: {
        state_machine::Complex::EVENT4EventData data{};
        root.spawn_EVENT4_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( int argc, char** argv ) {

  state_machine::Complex::GeneratedEventBase* e = nullptr;
  bool handled = false;

  // create the HFSM
  state_machine::Complex::Root Complex_root;

  #if DEBUG_OUTPUT
  Complex_root.set_log_callback([](std::string_view msg) {
    std::cout << msg << std::endl;
  });
  #endif

  // initialize the HFSM
  Complex_root.initialize();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      break;
    }
    else if (selection == RestartSelection) {
      Complex_root.restart();
    }
    else if (selection == TickSelection) {
      Complex_root.tick();
    }
    else {
      makeEvent( Complex_root, selection );
    }
    Complex_root.handle_all_events();
  }

  return 0;
};
