#pragma once

#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <deque>
#include <functional>
#include <mutex>
#include <string>
#include <string_view>

#include "deep_history_state.hpp"
#include "magic_enum.hpp"
#include "shallow_history_state.hpp"
#include "state_base.hpp"

#include "Payloads_event_data.hpp"

// User Includes for the HFSM
//::::/p/m::::Includes::::
#include <cstdio>

namespace state_machine::Payloads {

    typedef std::function<void(std::string_view)> LogCallback;

    enum class EventType {
      BUTTON_PRESS,
      CALIBRATE,
      FINISH,
      SET_SPEED,
      STOP,
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
      // event name plus payload fields (payload omitted when empty)
      std::string to_string() const override {
        std::string payload = event_data_to_string(data);
        return payload.empty() ? GeneratedEventBase::to_string()
                               : GeneratedEventBase::to_string() + " " + payload;
      }
    }; // Class Event

    // free the memory associated with the event
    static void consume_event(GeneratedEventBase *e) {
      delete e;
    }

    typedef Event<BUTTON_PRESSEventData> BUTTON_PRESSEvent;
    typedef Event<CALIBRATEEventData> CALIBRATEEvent;
    typedef Event<FINISHEventData> FINISHEvent;
    typedef Event<SET_SPEEDEventData> SET_SPEEDEvent;
    typedef Event<STOPEventData> STOPEvent;

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

      void spawn_BUTTON_PRESS_event(const BUTTON_PRESSEventData &data) {
        GeneratedEventBase *new_event = new BUTTON_PRESSEvent{EventType::BUTTON_PRESS, data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_CALIBRATE_event(const CALIBRATEEventData &data) {
        GeneratedEventBase *new_event = new CALIBRATEEvent{EventType::CALIBRATE, data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_FINISH_event(const FINISHEventData &data) {
        GeneratedEventBase *new_event = new FINISHEvent{EventType::FINISH, data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_SET_SPEED_event(const SET_SPEEDEventData &data) {
        GeneratedEventBase *new_event = new SET_SPEEDEvent{EventType::SET_SPEED, data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_STOP_event(const STOPEventData &data) {
        GeneratedEventBase *new_event = new STOPEvent{EventType::STOP, data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }

      // Returns the number of events in the queue
      size_t get_num_events(void) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        return events_.size();
      }

      // Blocks until an event is available. Uses a predicate so that
      // spurious wakeups do not cause a return with an empty queue.
      void wait_for_events(void) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait(lock, [this] { return !events_.empty(); });
      }

      // Blocks until an event is available or the timeout is reached
      void sleep_until_event(float seconds) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait_for(lock, std::chrono::duration<float>(seconds),
                           [this] { return !events_.empty(); });
      }

      // Blocks until an event is available, then removes and returns
      // it. Waits and pops under a single lock so that no other
      // consumer can drain the queue in between.
      GeneratedEventBase *get_next_event_blocking(void) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait(lock, [this] { return !events_.empty(); });
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
        std::deque<GeneratedEventBase*> deq_copy;
        { std::lock_guard<std::mutex> lock(queue_mutex_);
          deq_copy = events_;
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
        for (size_t i = 0; i < events_.size(); i++) {
          if (i > 0) {
            qStr += ", ";
          }
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
      //::::/p/m::::Declarations::::
        int pressCount = 0;
  float speed = 0.0f;

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
      void spawn_BUTTON_PRESS_event(const BUTTON_PRESSEventData &data) { event_factory.spawn_BUTTON_PRESS_event(data); }
      void spawn_CALIBRATE_event(const CALIBRATEEventData &data) { event_factory.spawn_CALIBRATE_event(data); }
      void spawn_FINISH_event(const FINISHEventData &data) { event_factory.spawn_FINISH_event(data); }
      void spawn_SET_SPEED_event(const SET_SPEEDEventData &data) { event_factory.spawn_SET_SPEED_event(data); }
      void spawn_STOP_event(const STOPEventData &data) { event_factory.spawn_STOP_event(data); }

      // Constructors
      Root() : StateBase(),
      PAYLOADS_OBJ__IDLE_OBJ ( this, this ),
            PAYLOADS_OBJ__RUNNING_OBJ ( this, this ),
            PAYLOADS_OBJ__END_OBJ ( this ),
      _root(this)
      {}
      ~Root(void) {}

      /**
       * @brief Fully initializes the HFSM. Runs the HFSM Initialization
       *  code from the model, then sets the inital state and runs the
       *  initial transition and entry actions accordingly.
       */
      void initialize(void) override;

      /**
       * @brief Returns true if there are any events in the event queue.
       */
      bool has_events(void) {
        return event_factory.get_num_events() > 0;
      }

      /**
       * @brief Sleeps until an event is available or the current state's timer
       *  period expires, then returns. If the current state has no
       *  timer period (e.g. the END state), this blocks until an event
       *  is available instead of busy-spinning on a zero timeout.
       */
      void sleep_until_event(void) {
        double period = getActiveLeaf()->getTimerPeriod();
        if (period > 0) {
          event_factory.sleep_until_event((float)period);
        } else {
          event_factory.wait_for_events();
        }
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
      bool handleEvent(EventBase * event) override {
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
      // Declaration for Idle : /p/m/Idle
      class Idle : public StateBase {
      public:
        // User Declarations for the State
        //::::/p/m/Idle::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        Idle  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~Idle ( void ) {}
      
        // StateBase Interface
        void   initialize ( void ) override;
        void   entry ( void ) override;
        void   exit ( void ) override;
        void   tick ( void ) override;
        double getTimerPeriod ( void ) override;
        bool   handleEvent ( EventBase* event ) override {
          return handleEvent( static_cast<GeneratedEventBase*>(event) );
        }
        virtual bool   handleEvent ( GeneratedEventBase* event );
      
      };
      // Declaration for Running : /p/m/Running
      class Running : public StateBase {
      public:
        // User Declarations for the State
        //::::/p/m/Running::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        Running  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~Running ( void ) {}
      
        // StateBase Interface
        void   initialize ( void ) override;
        void   entry ( void ) override;
        void   exit ( void ) override;
        void   tick ( void ) override;
        double getTimerPeriod ( void ) override;
        bool   handleEvent ( EventBase* event ) override {
          return handleEvent( static_cast<GeneratedEventBase*>(event) );
        }
        virtual bool   handleEvent ( GeneratedEventBase* event );
      
      };

      // END STATE
      /**
       * @brief This is the terminal END STATE for the HFSM, after which no
       *  events or other actions will be processed.
       */
      class End : public StateBase {
      public:
        explicit End ( StateBase* parent ) : StateBase(parent) {}
        void entry ( void ) override {}
        void exit ( void ) override {}
        void tick ( void ) override {}
        // Simply returns true since the END STATE trivially handles all
        // events.
        bool handleEvent ( EventBase* /*event*/ ) override { return true; }
        bool handleEvent ( GeneratedEventBase* /*event*/ ) { return true; }
      };

      // State Objects
      Idle PAYLOADS_OBJ__IDLE_OBJ;
      Running PAYLOADS_OBJ__RUNNING_OBJ;
      // END state object
      End PAYLOADS_OBJ__END_OBJ;
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

}; // namespace state_machine::Payloads
