#include <iostream>
#include <string>

#include "Features_generated_states.hpp"

const int numEvents        = 8;
const int TickSelection    = numEvents + 1;
const int RestartSelection = numEvents + 2;
const int ExitSelection    = numEvents + 3;

void displayEventMenu() {
  std::cout << "\n-----\nSelect which event to spawn:" << std::endl <<
    "\t0. BACK" << std::endl <<
    "\t1. CHOOSE" << std::endl <<
    "\t2. FINISH" << std::endl <<
    "\t3. GO_DEEP" << std::endl <<
    "\t4. GO_HIST" << std::endl <<
    "\t5. LOCAL_GO" << std::endl <<
    "\t6. NEXT" << std::endl <<
    "\t7. TOGGLE" << std::endl <<
    "\t8. None" << std::endl <<
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

void makeEvent(state_machine::Features::Root& root, int eventIndex) {
  if ( eventIndex < numEvents && eventIndex > -1 ) {
    switch (eventIndex) {
      case 0: {
        state_machine::Features::BACKEventData data{};
        root.spawn_BACK_event(data);
        break;
      }
      case 1: {
        state_machine::Features::CHOOSEEventData data{};
        root.spawn_CHOOSE_event(data);
        break;
      }
      case 2: {
        state_machine::Features::FINISHEventData data{};
        root.spawn_FINISH_event(data);
        break;
      }
      case 3: {
        state_machine::Features::GO_DEEPEventData data{};
        root.spawn_GO_DEEP_event(data);
        break;
      }
      case 4: {
        state_machine::Features::GO_HISTEventData data{};
        root.spawn_GO_HIST_event(data);
        break;
      }
      case 5: {
        state_machine::Features::LOCAL_GOEventData data{};
        root.spawn_LOCAL_GO_event(data);
        break;
      }
      case 6: {
        state_machine::Features::NEXTEventData data{};
        root.spawn_NEXT_event(data);
        break;
      }
      case 7: {
        state_machine::Features::TOGGLEEventData data{};
        root.spawn_TOGGLE_event(data);
        break;
      }
      default:
        break;
    }
  }
}

int main( void ) {

  // create the HFSM
  state_machine::Features::Root Features_root;

  #if DEBUG_OUTPUT
  Features_root.set_log_callback([](std::string_view msg) {
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
  Features_root.initialize();
  Features_root.handle_all_events();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      Features_root.terminate();
      break;
    }
    else if (selection == RestartSelection) {
      Features_root.restart();
    }
    else if (selection == TickSelection) {
      Features_root.tick();
    }
    else {
      makeEvent( Features_root, selection );
    }
    // run all events (including any spawned by the handling of prior
    // events) to completion before prompting again
    Features_root.handle_all_events();
  }

  return 0;
};
