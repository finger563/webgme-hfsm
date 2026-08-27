#include <iostream>
#include <string>

#include "Basic_generated_states.hpp"

const int numEvents        = 3;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. ENDEVENT" << std::endl <<
    "\t1. START" << std::endl <<
    "\t2. STOP" << std::endl <<
    "\t3. None" << std::endl <<
    "\t" << TickSelection << ". HFSM Tick" << std::endl <<
    "\t" << RestartSelection << ". Restart HFSM" << std::endl <<
    "\t" << ExitSelection << ". Exit HFSM" << std::endl <<
    "selection: ";
}

int getUserSelection() {
  int s = 0;
  std::cin >> s;
  if (std::cin.fail()) {
    // invalid input or EOF: treat as a request to exit so that piped /
    // non-interactive input cannot spin the test bench forever.
    return ExitSelection;
  }
  return s;
}

void makeEvent(state_machine::Basic::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Basic::ENDEVENTEventData data{};
        root.spawn_ENDEVENT_event(data);
        break;
      }
      case 1: {
        state_machine::Basic::STARTEventData data{};
        root.spawn_START_event(data);
        break;
      }
      case 2: {
        state_machine::Basic::STOPEventData data{};
        root.spawn_STOP_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( void ) {

  // create the HFSM
  state_machine::Basic::Root Basic_root;

  #if DEBUG_OUTPUT
  Basic_root.set_log_callback([](std::string_view msg) {
    std::cout << msg << std::endl;
  });
  #endif

  // NOTE: this test bench is deliberately single-threaded: the menu
  //       drives the HFSM directly and every spawned event is handled
  //       synchronously (run-to-completion) before the next prompt.
  //       The state tree itself is NOT thread-safe; in a real system
  //       one thread should own the HFSM (initialize / handle events /
  //       tick) while other threads / ISRs may only spawn events into
  //       it through the thread-safe event factory, e.g.:
  //
  //         std::thread hfsm_thread([&root, &done]() {
  //           root.initialize();
  //           while (!done) {
  //             root.handle_all_events();
  //             root.tick();
  //             root.handle_all_events();
  //             root.sleep_until_event();
  //           }
  //         });

  // initialize the HFSM
  Basic_root.initialize();
  Basic_root.handle_all_events();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      Basic_root.terminate();
      break;
    }
    else if (selection == RestartSelection) {
      Basic_root.restart();
    }
    else if (selection == TickSelection) {
      Basic_root.tick();
    }
    else {
      makeEvent( Basic_root, selection );
    }
    // run all events (including any spawned by the handling of prior
    // events) to completion before prompting again
    Basic_root.handle_all_events();
  }

  return 0;
};
