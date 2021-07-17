#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"
#include "EventBase.hpp"

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

// User Includes for the HFSM
//::::{{{path}}}::::Includes::::
{{{ Includes }}}

namespace StateMachine {

  namespace {{{sanitizedName}}} {

    class Event : public EventBase {
    public:
      enum class Type {
        {{#each eventNames}}
        {{{.}}},
        {{/each}}
      }; // ENUMS GENERATED FROM MODEL

      /**
       * @brief Constructor for initializing the type.
       */
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
    };


    /**
     * @brief Class handling all Event creation, memory management, and
     *  ordering.
     */
    class EventFactory {
    public:
      /**
       * @brief Destructor; ensures all memory for all Events is
       * deallocated.
       */
      ~EventFactory(void) { clearEvents(); }

      /**
       * @brief Allocates new memory for a new Event of type t and adds
       * it to the Q.
       *
       * @param[in]  Event::Type  t  The type of the event to create
       */
      void spawnEvent(Event::Type t) {
        Event *newEvent = new Event(t);
        _eventQ.push_back(newEvent);
      }

      /**
       * @brief Frees the memory associated with the Event.
       *
       * @param[in]  Event*       e  Pointer to the event to consume
       */
      void consumeEvent(Event *e) {
        delete e;
        e = nullptr;
      }

      /**
       * @brief Retrieves the pointer to the next event in the queue, or
       * nullptr if the Q is empty.
       *
       * @return     Event*          Oldest Event that was in the Queue
       */
      Event *getNextEvent(void) {
        Event *ptr = nullptr;
        if (_eventQ.size()) {
          ptr = _eventQ.front();
          _eventQ.pop_front(); // remove the event from the Q
        }
        return ptr;
      }

      /**
       * @brief Clears the event queue and frees all memory associated
       * with the events.
       */
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
    };

    // ROOT OF THE HFSM
    class Root : public StateMachine::StateBase {
    public:
      // User Declarations for the HFSM
      //::::{{{path}}}::::Declarations::::
      {{{Declarations}}}

      // event factory for spawning / ordering events
      EventFactory eventFactory;

      // END STATE
      {{> EndStateTemplHpp}}
      {{~/END}}

      // Constructors
      Root(void) : StateBase() {}
      Root(StateBase * _parent) : StateBase(_parent) {}
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
      bool handleEvent(Event * event);

      // Child Substates
      {{#each Substates}}
      {{> StateTemplHpp}}
      {{/each}}
      {{#END}}

      // state objects
      {{> PointerTemplHpp this}}
      {{#END}}
      // END state object
      StateMachine::StateBase {{{pointerName}}};
      {{~/END}}
    }; // class Root
  }; // namespace {{{sanitizedName}}}
}; // namespace StateMachine
