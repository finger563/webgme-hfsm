#include <iostream>
#include <string>

#include "Payloads_generated_states.hpp"

const int numEvents        = 5;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. BUTTON_PRESS" << std::endl <<
    "\t1. CALIBRATE" << std::endl <<
    "\t2. FINISH" << std::endl <<
    "\t3. SET_SPEED" << std::endl <<
    "\t4. STOP" << std::endl <<
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

void makeEvent(state_machine::Payloads::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Payloads::BUTTON_PRESSEventData data{};
        root.spawn_BUTTON_PRESS_event(data);
        break;
      }
      case 1: {
        state_machine::Payloads::CALIBRATEEventData data{};
        root.spawn_CALIBRATE_event(data);
        break;
      }
      case 2: {
        state_machine::Payloads::FINISHEventData data{};
        root.spawn_FINISH_event(data);
        break;
      }
      case 3: {
        state_machine::Payloads::SET_SPEEDEventData data{};
        root.spawn_SET_SPEED_event(data);
        break;
      }
      case 4: {
        state_machine::Payloads::STOPEventData data{};
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
  state_machine::Payloads::Root Payloads_root;

  #if DEBUG_OUTPUT
  Payloads_root.set_log_callback([](std::string_view msg) {
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
  Payloads_root.initialize();
  Payloads_root.handle_all_events();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      Payloads_root.terminate();
      break;
    }
    else if (selection == RestartSelection) {
      Payloads_root.restart();
    }
    else if (selection == TickSelection) {
      Payloads_root.tick();
    }
    else {
      makeEvent( Payloads_root, selection );
    }
    // run all events (including any spawned by the handling of prior
    // events) to completion before prompting again
    Payloads_root.handle_all_events();
  }

  return 0;
};
