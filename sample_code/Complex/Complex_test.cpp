#include <iostream>
#include <string>

#include "Complex_generated_states.hpp"

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
  if (std::cin.fail()) {
    // invalid input or EOF: treat as a request to exit so that piped /
    // non-interactive input cannot spin the test bench forever.
    return ExitSelection;
  }
  return s;
}

void makeEvent(espp::state_machine::Complex::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        espp::state_machine::Complex::ENDEVENTEventData data{};
        root.spawn_ENDEVENT_event(data);
        break;
      }
      case 1: {
        espp::state_machine::Complex::EVENT1EventData data{};
        root.spawn_EVENT1_event(data);
        break;
      }
      case 2: {
        espp::state_machine::Complex::EVENT2EventData data{};
        root.spawn_EVENT2_event(data);
        break;
      }
      case 3: {
        espp::state_machine::Complex::EVENT3EventData data{};
        root.spawn_EVENT3_event(data);
        break;
      }
      case 4: {
        espp::state_machine::Complex::EVENT4EventData data{};
        root.spawn_EVENT4_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( void ) {

  // create the HFSM
  espp::state_machine::Complex::Root Complex_root;

  #if DEBUG_OUTPUT
  Complex_root.set_log_callback([](std::string_view msg) {
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
  Complex_root.initialize();
  Complex_root.handle_all_events();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      Complex_root.terminate();
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
    // run all events (including any spawned by the handling of prior
    // events) to completion before prompting again
    Complex_root.handle_all_events();
  }

  return 0;
};
