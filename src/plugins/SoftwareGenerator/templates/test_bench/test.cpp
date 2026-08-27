#include <iostream>
#include <string>

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
  if (std::cin.fail()) {
    // invalid input or EOF: treat as a request to exit so that piped /
    // non-interactive input cannot spin the test bench forever.
    return ExitSelection;
  }
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

int main( void ) {

  // create the HFSM
  {{{namespace}}}::{{{sanitizedName}}}::Root {{{sanitizedName}}}_root;

  #if DEBUG_OUTPUT
  {{{sanitizedName}}}_root.set_log_callback([](std::string_view msg) {
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
  {{{sanitizedName}}}_root.initialize();
  {{{sanitizedName}}}_root.handle_all_events();

  while ( true ) {
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      {{{sanitizedName}}}_root.terminate();
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
    // run all events (including any spawned by the handling of prior
    // events) to completion before prompting again
    {{{sanitizedName}}}_root.handle_all_events();
  }

  return 0;
};
