#include <atomic>
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

  std::atomic<bool> done{false};

  // make a thread for the HFSM
  std::thread hfsm_thread([&{{{sanitizedName}}}_root, &done]() {
    // initialize the HFSM
    {{{sanitizedName}}}_root.initialize();
    while (!done) {
      {{{sanitizedName}}}_root.handle_all_events();

      // NOTE: we would normally call the tick() function here, but we want to
      //       be able to manually tick the HFSM from the test bench and we
      //       don't want to clutter the log with the tick() messages.
      // {{{sanitizedName}}}_root.tick();

      // NOTE: if we call tick above, then we should call handle_all_events()
      //       again to handle any events that were spawned by the tick()
      //       function
      // {{{sanitizedName}}}_root.handle_all_events();

      {{{sanitizedName}}}_root.sleep_until_event();
    }
  });

  using namespace std::chrono_literals;

  while ( !done ) {
    // wait for the HFSM to be ready for events before we show the menu
    do {
      std::this_thread::sleep_for(100ms);
    } while ({{{sanitizedName}}}_root.has_events());
    displayEventMenu();
    int selection = getUserSelection();
    if (selection == ExitSelection) {
      {{{sanitizedName}}}_root.terminate();
      done = true;
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
  }

  // wait for the HFSM thread to exit
  hfsm_thread.join();

  return 0;
};
