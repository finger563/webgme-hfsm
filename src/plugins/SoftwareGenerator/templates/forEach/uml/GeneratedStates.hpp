#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

// User Includes for the HFSM
//::::{{{path}}}::::Includes::::
{{{ Includes }}}

namespace StateMachine {

  namespace {{{sanitizedName}}} {

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    class Event : public EventBase {
    public:
      enum class Type {
        {{#each eventNames}}
        {{{.}}},
        {{/each}}
      }; // ENUMS GENERATED FROM MODEL
      Event(Type t) : _t(t) {}
      Type type(void) { return _t; }
#ifdef DEBUG_OUTPUT
      static std::string toString(Event *e) {
        std::string eventString = "";
        switch (e->_t) {
        {{#each eventNames}}
        case Type::{{{.}}}:
          eventString = "{{{.}}}";
          break;
        {{/each}}
        default:
          break;
        }
        return eventString;
      }
#endif
    protected:
      Type _t;
    }; // Class Event

    /**
     * @brief Class handling all Event creation, memory management, and
     *  ordering.
     */
    class EventFactory {
    public:
      ~EventFactory(void) { clearEvents(); }

      // allocate memory for an event and add it to the Q
      void spawnEvent(Event::Type t) {
        Event *newEvent = new Event(t);
        _eventQ.push_back(newEvent);
      }

      // free the memory associated with the event
      void consumeEvent(Event *e) {
        delete e;
        e = nullptr;
      }

      // Retrieves the pointer to the next event in the queue, or
      // nullptr if it doesn't exist
      Event *getNextEvent(void) {
        Event *ptr = nullptr;
        if (_eventQ.size()) {
          ptr = _eventQ.front();
          _eventQ.pop_front(); // remove the event from the Q
        }
        return ptr;
      }

      // Clears the event queue and frees all event memory
      void clearEvents(void) {
        Event *ptr = getNextEvent();
        while (ptr != nullptr) {
          consumeEvent(ptr);
          ptr = getNextEvent();
        }
      }

#ifdef DEBUG_OUTPUT
      std::string toString(void) {
        std::string qStr = "[ ";
        for (int i = 0; i < _eventQ.size(); i++) {
          qStr += Event::toString(_eventQ[i]);
        }
        qStr += " ]";
        return qStr;
      }
#endif

    protected:
      std::deque<Event *> _eventQ;
    }; // class EventFactory

    /**
     * @brief The ROOT of the HFSM - contains the declarations from
     *  the user as well as the entire substate tree.
     */
    class Root : public StateBase {
    public:
      // User Declarations for the HFSM
      //::::{{{path}}}::::Declarations::::
      {{{Declarations}}}

    public:
      // event factory for spawning / ordering events
      EventFactory eventFactory;

      // Constructors
      Root() : StateBase(),
      {{#each Substates}}
      {{> ConstructorTempl this}}
      {{#if isDeepHistory}}
      {{{ pointerName }}} ( this ),
      {{else if isShallowHistory}}
      {{{ pointerName }}} ( this ),
      {{else if isState}}
      {{{ pointerName }}} ( this, this ),
      {{/if}}
      {{/each}}
      {{#END}}
      {{{ pointerName }}} ( this ),
      {{/END}}
      _root(this)
      {}
      ~Root(void) {}

      /**
       * @brief Fully initializes the HFSM. Runs the HFSM Initialization
       *  code from the model, then sets the inital state and runs the
       *  initial transition and entry actions accordingly.
       */
      void initialize(void);

      /**
       * @brief Terminates the HFSM, calling exit functions for the
       *  active leaf state upwards through its parents all the way to
       *  the root.
       */
      void terminate(void);

      /**
       * @brief Restarts the HFSM by calling terminate and then
       *  initialize.
       */
      void restart(void);

      /**
       * @brief Returns true if the HFSM has reached its END State
       */
      bool hasStopped(void);

      /**
       * @brief Calls handleEvent on the activeLeaf.
       *
       * @param[in] Event* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool handleEvent(EventBase * event) {
        return handleEvent( static_cast<Event*>(event) );
      }

      /**
       * @brief Calls handleEvent on the activeLeaf.
       *
       * @param[in] Event* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool handleEvent(Event * event);

      // Child Substates
      {{#each Substates}}
      {{> StateTemplHpp}}
      {{/each}}

      // END STATE
      {{#END}}
      {{> EndStateTemplHpp}}
      {{~/END}}

      // Keep a _root for easier templating, it will point to us
      Root *_root;
      // State Objects
      {{> PointerTemplHpp this}}
      {{#END}}
      // END state object
      End_State {{{pointerName}}};
      {{/END}}
    }; // class Root

  }; // namespace {{{sanitizedName}}}
}; // namespace StateMachine
