#pragma once

#include <condition_variable>
#include <deque>
#include <functional>
#include <mutex>
#include <string>

#include "deep_history_state.hpp"
#include "magic_enum.hpp"
#include "shallow_history_state.hpp"
#include "state_base.hpp"

#include "{{{sanitizedName}}}_event_data.hpp"

// User Includes for the HFSM
//::::{{{path}}}::::Includes::::
{{{ Includes }}}

namespace {{{namespace}}}::{{{sanitizedName}}} {

    typedef std::function<void(std::string_view)> LogCallback;

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

    // free the memory associated with the event
    static void consume_event(GeneratedEventBase *e) {
      delete e;
    }

    {{#each eventNames}}
    typedef Event<{{{.}}}EventData> {{{.}}}Event;
    {{/each}}

    /**
     * @brief Class handling all Event creation, memory management, and
     *  ordering.
     */
    class EventFactory {
    public:
      ~EventFactory(void) { clear_events(); }

      void set_log_callback(LogCallback cb) {
        log_callback_ = cb;
      }

      {{#each eventNames}}
      void spawn_{{{.}}}_event(const {{{.}}}EventData &data) {
        log("\033[32mSPAWN: {{{.}}}\033[0m");
        GeneratedEventBase *new_event = new {{{.}}}Event{EventType::{{{.}}}, data};
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      {{/each}}

      // Returns the number of events in the queue
      size_t get_num_events(void) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        return events_.size();
      }

      // Blocks until an event is available
      void wait_for_events(void) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        if (events_.size() > 0) {
          return;
        }
        queue_cv_.wait(lock);
      }

      // Blocks until an event is available or the timeout is reached
      void sleep_until_event(float seconds) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        if (events_.size() > 0) {
          return;
        }
        queue_cv_.wait_for(lock, std::chrono::duration<float>(seconds));
      }

      // Blocks until an event is available
      GeneratedEventBase *get_next_event_blocking(void) {
        wait_for_events();
        std::unique_lock<std::mutex> lock(queue_mutex_);
        GeneratedEventBase *ptr = events_.front();
        events_.pop_front(); // remove the event from the Q
        return ptr;
      }

      // Retrieves the pointer to the next event in the queue, or
      // nullptr if it doesn't exist
      GeneratedEventBase *get_next_event(void) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        GeneratedEventBase *ptr = nullptr;
        if (events_.size()) {
          ptr = events_.front();
          events_.pop_front(); // remove the event from the Q
        }
        return ptr;
      }

      // Clears the event queue and frees all event memory
      void clear_events(void) {
        // copy the queue so we can free the memory without holding the lock
        { std::lock_guard<std::mutex> lock(queue_mutex_);
          auto deq_copy = events_;
          events_.clear();
        }
        // make sure we don't hold the lock while freeing memory
        for (auto ptr : deq_copy) {
          consume_event(ptr);
        }
      }

      std::string to_string(void) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        std::string qStr = "[ ";
        for (int i = 0; i < events_.size(); i++) {
          qStr += events_[i]->to_string();
        }
        qStr += " ]";
        return qStr;
      }

    protected:
      void log(std::string_view msg) {
        if (log_callback_) {
          log_callback_(msg);
        }
      }

      std::deque<GeneratedEventBase*> events_;
      std::mutex queue_mutex_;
      std::condition_variable queue_cv_;
      LogCallback log_callback_{nullptr};
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

    protected:
      void log(const std::string& msg) {
        if (log_callback_) {
          log_callback_(msg);
        }
      }

      LogCallback log_callback_{nullptr};

    public:
      // event factory for spawning / ordering events
      EventFactory event_factory;

      void set_log_callback(LogCallback cb) {
        log_callback_ = cb;
        event_factory.set_log_callback(cb);
      }

      // helper functions for spawning events into the HFSM
      {{#each eventNames}}
      void spawn_{{{.}}}_event(const {{{.}}}EventData &data) { event_factory.spawn_{{{.}}}_event(data); }
      {{/each}}

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
       * @brief Returns true if there are any events in the event queue.
       */
      bool has_events(void) {
        return event_factory.get_num_events() > 0;
      }

      /**
       * @brief Sleeps until an event is available or the current state's timer
       *  period expires, then returns. This will block until an event is
       *  available. The amount of time spent sleeping is determined by the
       *  current state's timer period.
       */
      void sleep_until_event(void) {
        event_factory.sleep_until_event(getActiveLeaf()->getTimerPeriod());
      }

      /**
       * @brief Waits for an event to be available, then returns.
       * This will block until an event is available.
       */
      void wait_for_events(void) {
        event_factory.wait_for_events();
      }

      /**
       * @brief Handles all events in the event queue, ensuring to free the
       * memory. This will ensure that any events spawned from other event
       * transitions / actions are handled. Returns once there are no more
       * events in the queue to process.
       */
      void handle_all_events(void);

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
      bool has_stopped(void);

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

}; // namespace {{{namespace}}}::{{{sanitizedName}}}
