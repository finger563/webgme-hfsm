#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"

#include <deque>
#include <string>
#include "magic_enum.hpp"
#include "{{{sanitizedName}}}_EventData.hpp"

// User Includes for the HFSM
//::::{{{path}}}::::Includes::::
{{{ Includes }}}

namespace StateMachine {

  namespace {{{sanitizedName}}} {

    enum class EventType {
      {{#each eventNames}}
      {{{.}}},
      {{/each}}
    }; // ENUMS GENERATED FROM MODEL

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Used as abstract interface for handleEvent().
     */
    class GeneratedEventBase : public EventBase {
    protected:
      EventType type;
    public:
      explicit GeneratedEventBase(const EventType& t) : type(t) {}
      virtual ~GeneratedEventBase() {}
      EventType get_type() const { return type; }
      virtual std::string to_string() const {
        return std::string(magic_enum::enum_name(type));
      }
    }; // Class GeneratedEventBase

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    template <typename T>
    class Event : public GeneratedEventBase {
      T data;
    public:
      explicit Event(const EventType& t, const T& d) : GeneratedEventBase(t), data(d) {}
      virtual ~Event() {}
      T get_data() const { return data; }
    }; // Class Event

    {{#each eventNames}}
    typedef Event<{{{.}}}EventData> {{{.}}}Event;
    {{/each}}

    /**
     * @brief Class handling all Event creation, memory management, and
     *  ordering.
     */
    class EventFactory {
    public:
      ~EventFactory(void) { clearEvents(); }

      {{#each eventNames}}
      void spawn_{{{.}}}_event(const {{{.}}}EventData &data) {
        GeneratedEventBase *new_event = new {{{.}}}Event{EventType::{{{.}}}, data};
        _eventQ.push_back(new_event);
      }
      {{/each}}

      // free the memory associated with the event
      void consumeEvent(GeneratedEventBase *e) {
        delete e;
        e = nullptr;
      }

      // Retrieves the pointer to the next event in the queue, or
      // nullptr if it doesn't exist
      GeneratedEventBase *getNextEvent(void) {
        GeneratedEventBase *ptr = nullptr;
        if (_eventQ.size()) {
          ptr = _eventQ.front();
          _eventQ.pop_front(); // remove the event from the Q
        }
        return ptr;
      }

      // Clears the event queue and frees all event memory
      void clearEvents(void) {
        GeneratedEventBase *ptr = getNextEvent();
        while (ptr != nullptr) {
          consumeEvent(ptr);
          ptr = getNextEvent();
        }
      }

      std::string to_string(void) {
        std::string qStr = "[ ";
        for (int i = 0; i < _eventQ.size(); i++) {
          qStr += _eventQ[i]->to_string();
        }
        qStr += " ]";
        return qStr;
      }

    protected:
      std::deque<GeneratedEventBase*> _eventQ;
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
       * @param[in] EventBase* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool handleEvent(EventBase * event) {
        return handleEvent( static_cast<GeneratedEventBase*>(event) );
      }

      /**
       * @brief Calls handleEvent on the activeLeaf.
       *
       * @param[in] EventBase* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool handleEvent(GeneratedEventBase * event);

      // Child Substates
      {{#each Substates}}
      {{> StateTemplHpp}}
      {{/each}}

      // END STATE
      {{#END}}
      {{> EndStateTemplHpp}}
      {{~/END}}

      // State Objects
      {{> PointerTemplHpp this}}
      {{#END}}
      // END state object
      End_State {{{pointerName}}};
      {{/END}}
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

  }; // namespace {{{sanitizedName}}}
}; // namespace StateMachine
