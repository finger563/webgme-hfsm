#pragma once

#include "state_base.hpp"
#include "deep_history_state.hpp"
#include "shallow_history_state.hpp"

#include <functional>
#include <deque>
#include <string>
#include <mutex>
#include "magic_enum.hpp"
#include "Simple_event_data.hpp"

// User Includes for the HFSM
//::::/9::::Includes::::


namespace state_machine::Simple {

    typedef std::function<void(std::string_view)> LogCallback;

    enum class EventType {
      INPUTEVENT,
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

    typedef Event<INPUTEVENTEventData> INPUTEVENTEvent;

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

      void spawn_INPUTEVENT_event(const INPUTEVENTEventData &data) {
        log("\033[32mSPAWN: INPUTEVENT\033[0m");
        GeneratedEventBase *new_event = new INPUTEVENTEvent{EventType::INPUTEVENT, data};
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }

      // Returns the number of events in the queue
      size_t get_num_events(void) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        return events_.size();
      }

      // Blocks until an event is available
      void wait_for_events(void) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait(lock);
      }

      // Blocks until an event is available or the timeout is reached
      void sleep_until_event(float seconds) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait_for(lock, std::chrono::duration<float>(seconds));
      }

      // Blocks until an event is available
      GeneratedEventBase *get_next_event_blocking(void) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        queue_cv_.wait(lock, [this]{ return events_.size() > 0; });
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
        GeneratedEventBase *ptr = get_next_event();
        while (ptr != nullptr) {
          consume_event(ptr);
          ptr = get_next_event();
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
      //::::/9::::Declarations::::
        bool buttonPressed{false};

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
      void spawn_INPUTEVENT_event(const INPUTEVENTEventData &data) { event_factory.spawn_INPUTEVENT_event(data); }

      // Constructors
      Root() : StateBase(),
            SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ ( this, &SIMPLE_OBJ__STATE_2_OBJ ),
                  SIMPLE_OBJ__STATE_2_OBJ ( this, this ),
            SIMPLE_OBJ__STATE_1_OBJ ( this, this ),
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
      // Declaration for State_2 : /9/v
      class State_2 : public StateBase {
      public:
        // User Declarations for the State
        //::::/9/v::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State_2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State_2 ( void ) {}
      
        // StateBase Interface
        void   initialize ( void );
        void   entry ( void );
        void   exit ( void );
        void   tick ( void );
        double getTimerPeriod ( void );
        virtual bool   handleEvent ( EventBase* event ) {
          return handleEvent( static_cast<GeneratedEventBase*>(event) );
        }
        virtual bool   handleEvent ( GeneratedEventBase* event );
      
        // Declaration for State_2::State : /9/v/C
        class State : public StateBase {
        public:
          // User Declarations for the State
          //::::/9/v/C::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          State  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~State ( void ) {}
        
          // StateBase Interface
          void   initialize ( void );
          void   entry ( void );
          void   exit ( void );
          void   tick ( void );
          double getTimerPeriod ( void );
          virtual bool   handleEvent ( EventBase* event ) {
            return handleEvent( static_cast<GeneratedEventBase*>(event) );
          }
          virtual bool   handleEvent ( GeneratedEventBase* event );
        
        };
      };
      // Declaration for State_1 : /9/Y
      class State_1 : public StateBase {
      public:
        // User Declarations for the State
        //::::/9/Y::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State_1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State_1 ( void ) {}
      
        // StateBase Interface
        void   initialize ( void );
        void   entry ( void );
        void   exit ( void );
        void   tick ( void );
        double getTimerPeriod ( void );
        virtual bool   handleEvent ( EventBase* event ) {
          return handleEvent( static_cast<GeneratedEventBase*>(event) );
        }
        virtual bool   handleEvent ( GeneratedEventBase* event );
      
      };

      // END STATE

      // State Objects
      State_2::State SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ;
      State_2 SIMPLE_OBJ__STATE_2_OBJ;
      State_1 SIMPLE_OBJ__STATE_1_OBJ;
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

}; // namespace state_machine::Simple
