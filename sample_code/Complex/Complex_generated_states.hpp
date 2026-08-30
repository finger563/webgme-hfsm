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

#include "Complex_event_data.hpp"

// User Includes for the HFSM
//::::/c::::Includes::::
#include <stdio.h>

namespace espp::state_machine::Complex {

    typedef std::function<void(std::string_view)> LogCallback;

    enum class EventType {
      ENDEVENT,
      EVENT1,
      EVENT2,
      EVENT3,
      EVENT4,
    }; // ENUMS GENERATED FROM MODEL

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Used as abstract interface for handleEvent().
     */
    class GeneratedEventBase : public EventBase {
    protected:
      EventType type;
      // protected: only the typed Event<T> subclasses may construct
      // events, and they bind `type` to the payload type through
      // EventTypeFor below -- so get_type() always matches the
      // dynamic type and the generated payload downcasts are safe
      explicit GeneratedEventBase(const EventType& t) : type(t) {}
    public:
      virtual ~GeneratedEventBase() {}
      EventType get_type() const { return type; }
      virtual std::string to_string() const {
        return std::string(magic_enum::enum_name(type));
      }
    }; // Class GeneratedEventBase

    // compile-time pairing between payload structs and EventType
    // values: a mismatched (type, payload) event is unrepresentable
    template <typename T> struct EventTypeFor;
    template <> struct EventTypeFor<ENDEVENTEventData> {
      static constexpr EventType value = EventType::ENDEVENT;
    };
    template <> struct EventTypeFor<EVENT1EventData> {
      static constexpr EventType value = EventType::EVENT1;
    };
    template <> struct EventTypeFor<EVENT2EventData> {
      static constexpr EventType value = EventType::EVENT2;
    };
    template <> struct EventTypeFor<EVENT3EventData> {
      static constexpr EventType value = EventType::EVENT3;
    };
    template <> struct EventTypeFor<EVENT4EventData> {
      static constexpr EventType value = EventType::EVENT4;
    };

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    template <typename T>
    class Event : public GeneratedEventBase {
      T data;
    public:
      explicit Event(const T& d)
        : GeneratedEventBase(EventTypeFor<T>::value), data(d) {}
      virtual ~Event() {}
      // const reference: guards / actions bind `data` to this without
      // copying the payload (the event outlives its handling)
      const T &get_data() const { return data; }
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

    typedef Event<ENDEVENTEventData> ENDEVENTEvent;
    typedef Event<EVENT1EventData> EVENT1Event;
    typedef Event<EVENT2EventData> EVENT2Event;
    typedef Event<EVENT3EventData> EVENT3Event;
    typedef Event<EVENT4EventData> EVENT4Event;

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

      void spawn_ENDEVENT_event(const ENDEVENTEventData &data) {
        GeneratedEventBase *new_event = new ENDEVENTEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT1_event(const EVENT1EventData &data) {
        GeneratedEventBase *new_event = new EVENT1Event{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT2_event(const EVENT2EventData &data) {
        GeneratedEventBase *new_event = new EVENT2Event{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT3_event(const EVENT3EventData &data) {
        GeneratedEventBase *new_event = new EVENT3Event{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT4_event(const EVENT4EventData &data) {
        GeneratedEventBase *new_event = new EVENT4Event{data};
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
      //::::/c::::Declarations::::
        bool goToEnd      = false;
  bool goToChoice   = true;
  bool goToHistory  = false;
  bool nextState    = false;
  bool killedState  = false;
  bool someGuard    = true;
  bool someTest     = true;

  int someNumber = 40;
  int someValue  = 50;

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
      void spawn_ENDEVENT_event(const ENDEVENTEventData &data) { event_factory.spawn_ENDEVENT_event(data); }
      void spawn_EVENT1_event(const EVENT1EventData &data) { event_factory.spawn_EVENT1_event(data); }
      void spawn_EVENT2_event(const EVENT2EventData &data) { event_factory.spawn_EVENT2_event(data); }
      void spawn_EVENT3_event(const EVENT3EventData &data) { event_factory.spawn_EVENT3_event(data); }
      void spawn_EVENT4_event(const EVENT4EventData &data) { event_factory.spawn_EVENT4_event(data); }

      // Constructors
      Root() : StateBase(),
      COMPLEX_OBJ__STATE_1_OBJ ( this, this ),
                  COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE_OBJ ( this, &COMPLEX_OBJ__STATE_2_OBJ ),
                  COMPLEX_OBJ__STATE_2_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ ( &COMPLEX_OBJ__STATE_2_OBJ ),
            COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE2_OBJ ( this, &COMPLEX_OBJ__STATE_2_OBJ ),
                        COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND_OBJ ( this, &COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ ),
                        COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND2_OBJ ( this, &COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ ),
                        COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ ( this, &COMPLEX_OBJ__STATE_2_OBJ ),
                  COMPLEX_OBJ__STATE_2_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ ( &COMPLEX_OBJ__STATE_2_OBJ ),
      COMPLEX_OBJ__STATE_2_OBJ ( this, this ),
                  COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE2_OBJ ( this, &COMPLEX_OBJ__STATE3_OBJ ),
                  COMPLEX_OBJ__STATE3_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ ( &COMPLEX_OBJ__STATE3_OBJ ),
            COMPLEX_OBJ__STATE3_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ ( &COMPLEX_OBJ__STATE3_OBJ ),
            COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE_OBJ ( this, &COMPLEX_OBJ__STATE3_OBJ ),
                  COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE3_OBJ ( this, &COMPLEX_OBJ__STATE3_OBJ ),
                  COMPLEX_OBJ__STATE3_OBJ ( this, this ),
            COMPLEX_OBJ__END_STATE_OBJ ( this ),
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
      // Declaration for State_1 : /c/Y
      class State_1 : public StateBase {
      public:
        // User Declarations for the State
        //::::/c/Y::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State_1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State_1 ( void ) {}
      
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
      // Declaration for State_2 : /c/v
      class State_2 : public StateBase {
      public:
        // User Declarations for the State
        //::::/c/v::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State_2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State_2 ( void ) {}
      
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
      
        // Declaration for State_2::ChildState : /c/v/K
        class ChildState : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/v/K::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState ( void ) {}
        
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
        // Declaration for State_2::ChildState2 : /c/v/e
        class ChildState2 : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/v/e::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState2 ( void ) {}
        
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
        // Declaration for State_2::ChildState3 : /c/v/z
        class ChildState3 : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/v/z::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState3  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState3 ( void ) {}
        
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
        
          // Declaration for State_2::ChildState3::Grand : /c/v/z/6
          class Grand : public StateBase {
          public:
            // User Declarations for the State
            //::::/c/v/z/6::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            Grand  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~Grand ( void ) {}
          
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
          // Declaration for State_2::ChildState3::Grand2 : /c/v/z/c
          class Grand2 : public StateBase {
          public:
            // User Declarations for the State
            //::::/c/v/z/c::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            Grand2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~Grand2 ( void ) {}
          
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
        };
      };
      // Declaration for State3 : /c/T
      class State3 : public StateBase {
      public:
        // User Declarations for the State
        //::::/c/T::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State3  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State3 ( void ) {}
      
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
      
        // Declaration for State3::ChildState2 : /c/T/0
        class ChildState2 : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/T/0::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState2 ( void ) {}
        
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
        // Declaration for State3::ChildState : /c/T/W
        class ChildState : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/T/W::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState ( void ) {}
        
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
        // Declaration for State3::ChildState3 : /c/T/w
        class ChildState3 : public StateBase {
        public:
          // User Declarations for the State
          //::::/c/T/w::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          ChildState3  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~ChildState3 ( void ) {}
        
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
      };

      // END STATE
      /**
       * @brief This is the terminal END STATE for the HFSM, after which no
       *  events or other actions will be processed.
       */
      class End_State : public StateBase {
      public:
        explicit End_State ( StateBase* parent ) : StateBase(parent) {}
        void entry ( void ) override {}
        void exit ( void ) override {}
        void tick ( void ) override {}
        // Simply returns true since the END STATE trivially handles all
        // events.
        bool handleEvent ( EventBase* /*event*/ ) override { return true; }
        bool handleEvent ( GeneratedEventBase* /*event*/ ) { return true; }
      };

      // State Objects
      State_1 COMPLEX_OBJ__STATE_1_OBJ;
      State_2::ChildState COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE_OBJ;
      DeepHistoryState COMPLEX_OBJ__STATE_2_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      State_2::ChildState2 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE2_OBJ;
      State_2::ChildState3::Grand COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND_OBJ;
      State_2::ChildState3::Grand2 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND2_OBJ;
      State_2::ChildState3 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ;
      ShallowHistoryState COMPLEX_OBJ__STATE_2_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      State_2 COMPLEX_OBJ__STATE_2_OBJ;
      State3::ChildState2 COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE2_OBJ;
      ShallowHistoryState COMPLEX_OBJ__STATE3_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      DeepHistoryState COMPLEX_OBJ__STATE3_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      State3::ChildState COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE_OBJ;
      State3::ChildState3 COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE3_OBJ;
      State3 COMPLEX_OBJ__STATE3_OBJ;
      // END state object
      End_State COMPLEX_OBJ__END_STATE_OBJ;
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

}; // namespace espp::state_machine::Complex
