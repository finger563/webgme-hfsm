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

#include "Features_event_data.hpp"

// User Includes for the HFSM
//::::/p/m::::Includes::::
#include <cstdio>

namespace state_machine::Features {

    typedef std::function<void(std::string_view)> LogCallback;

    enum class EventType {
      BACK,
      CHOOSE,
      FINISH,
      GO_DEEP,
      GO_HIST,
      LOCAL_GO,
      NEXT,
      TOGGLE,
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
    template <> struct EventTypeFor<BACKEventData> {
      static constexpr EventType value = EventType::BACK;
    };
    template <> struct EventTypeFor<CHOOSEEventData> {
      static constexpr EventType value = EventType::CHOOSE;
    };
    template <> struct EventTypeFor<FINISHEventData> {
      static constexpr EventType value = EventType::FINISH;
    };
    template <> struct EventTypeFor<GO_DEEPEventData> {
      static constexpr EventType value = EventType::GO_DEEP;
    };
    template <> struct EventTypeFor<GO_HISTEventData> {
      static constexpr EventType value = EventType::GO_HIST;
    };
    template <> struct EventTypeFor<LOCAL_GOEventData> {
      static constexpr EventType value = EventType::LOCAL_GO;
    };
    template <> struct EventTypeFor<NEXTEventData> {
      static constexpr EventType value = EventType::NEXT;
    };
    template <> struct EventTypeFor<TOGGLEEventData> {
      static constexpr EventType value = EventType::TOGGLE;
    };

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    template <typename T>
    class Event : public GeneratedEventBase {
      T data;
      // private: only the generated EventFactory constructs events.
      // EventTypeFor is a public trait and could be specialized for a
      // foreign payload type, but without a way to construct such an
      // Event the (type, payload) pairing still cannot be forged.
      explicit Event(const T& d)
        : GeneratedEventBase(EventTypeFor<T>::value), data(d) {}
      friend class EventFactory;
    public:
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

    typedef Event<BACKEventData> BACKEvent;
    typedef Event<CHOOSEEventData> CHOOSEEvent;
    typedef Event<FINISHEventData> FINISHEvent;
    typedef Event<GO_DEEPEventData> GO_DEEPEvent;
    typedef Event<GO_HISTEventData> GO_HISTEvent;
    typedef Event<LOCAL_GOEventData> LOCAL_GOEvent;
    typedef Event<NEXTEventData> NEXTEvent;
    typedef Event<TOGGLEEventData> TOGGLEEvent;

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

      void spawn_BACK_event(const BACKEventData &data) {
        GeneratedEventBase *new_event = new BACKEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_CHOOSE_event(const CHOOSEEventData &data) {
        GeneratedEventBase *new_event = new CHOOSEEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_FINISH_event(const FINISHEventData &data) {
        GeneratedEventBase *new_event = new FINISHEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_GO_DEEP_event(const GO_DEEPEventData &data) {
        GeneratedEventBase *new_event = new GO_DEEPEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_GO_HIST_event(const GO_HISTEventData &data) {
        GeneratedEventBase *new_event = new GO_HISTEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_LOCAL_GO_event(const LOCAL_GOEventData &data) {
        GeneratedEventBase *new_event = new LOCAL_GOEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_NEXT_event(const NEXTEventData &data) {
        GeneratedEventBase *new_event = new NEXTEvent{data};
        log("\033[32mSPAWN: " + new_event->to_string() + "\033[0m");
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_TOGGLE_event(const TOGGLEEventData &data) {
        GeneratedEventBase *new_event = new TOGGLEEvent{data};
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
        bool goLeft = false;
  int count = 0;

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
      void spawn_BACK_event(const BACKEventData &data) { event_factory.spawn_BACK_event(data); }
      void spawn_CHOOSE_event(const CHOOSEEventData &data) { event_factory.spawn_CHOOSE_event(data); }
      void spawn_FINISH_event(const FINISHEventData &data) { event_factory.spawn_FINISH_event(data); }
      void spawn_GO_DEEP_event(const GO_DEEPEventData &data) { event_factory.spawn_GO_DEEP_event(data); }
      void spawn_GO_HIST_event(const GO_HISTEventData &data) { event_factory.spawn_GO_HIST_event(data); }
      void spawn_LOCAL_GO_event(const LOCAL_GOEventData &data) { event_factory.spawn_LOCAL_GO_event(data); }
      void spawn_NEXT_event(const NEXTEventData &data) { event_factory.spawn_NEXT_event(data); }
      void spawn_TOGGLE_event(const TOGGLEEventData &data) { event_factory.spawn_TOGGLE_event(data); }

      // Constructors
      Root() : StateBase(),
            FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ ( this, &FEATURES_OBJ__STATEA_OBJ ),
                  FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ ( this, &FEATURES_OBJ__STATEA_OBJ ),
                  FEATURES_OBJ__STATEA_OBJ ( this, this ),
                  FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ ( this, &FEATURES_OBJ__STATEB_OBJ ),
                        FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ ( this, &FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ ),
                        FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2B_OBJ ( this, &FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ ),
                        FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ ( this, &FEATURES_OBJ__STATEB_OBJ ),
                  FEATURES_OBJ__STATEB_OBJ__SHALLOWHISTORY_OBJ ( &FEATURES_OBJ__STATEB_OBJ ),
            FEATURES_OBJ__STATEB_OBJ__DEEPHISTORY_OBJ ( &FEATURES_OBJ__STATEB_OBJ ),
      FEATURES_OBJ__STATEB_OBJ ( this, this ),
            FEATURES_OBJ__END_OBJ ( this ),
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
      // Declaration for StateA : /p/m/A
      class StateA : public StateBase {
      public:
        // User Declarations for the State
        //::::/p/m/A::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        StateA  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~StateA ( void ) {}
      
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
      
        // Declaration for StateA::StateA1 : /p/m/A/A1
        class StateA1 : public StateBase {
        public:
          // User Declarations for the State
          //::::/p/m/A/A1::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          StateA1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~StateA1 ( void ) {}
        
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
        // Declaration for StateA::StateA2 : /p/m/A/A2
        class StateA2 : public StateBase {
        public:
          // User Declarations for the State
          //::::/p/m/A/A2::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          StateA2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~StateA2 ( void ) {}
        
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
      // Declaration for StateB : /p/m/B
      class StateB : public StateBase {
      public:
        // User Declarations for the State
        //::::/p/m/B::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        StateB  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~StateB ( void ) {}
      
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
      
        // Declaration for StateB::StateB1 : /p/m/B/B1
        class StateB1 : public StateBase {
        public:
          // User Declarations for the State
          //::::/p/m/B/B1::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          StateB1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~StateB1 ( void ) {}
        
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
        // Declaration for StateB::StateB2 : /p/m/B/B2
        class StateB2 : public StateBase {
        public:
          // User Declarations for the State
          //::::/p/m/B/B2::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          StateB2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~StateB2 ( void ) {}
        
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
        
          // Declaration for StateB::StateB2::StateB2a : /p/m/B/B2/B2a
          class StateB2a : public StateBase {
          public:
            // User Declarations for the State
            //::::/p/m/B/B2/B2a::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            StateB2a  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~StateB2a ( void ) {}
          
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
          // Declaration for StateB::StateB2::StateB2b : /p/m/B/B2/B2b
          class StateB2b : public StateBase {
          public:
            // User Declarations for the State
            //::::/p/m/B/B2/B2b::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            StateB2b  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~StateB2b ( void ) {}
          
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
      StateA::StateA1 FEATURES_OBJ__STATEA_OBJ__STATEA1_OBJ;
      StateA::StateA2 FEATURES_OBJ__STATEA_OBJ__STATEA2_OBJ;
      StateA FEATURES_OBJ__STATEA_OBJ;
      StateB::StateB1 FEATURES_OBJ__STATEB_OBJ__STATEB1_OBJ;
      StateB::StateB2::StateB2a FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2A_OBJ;
      StateB::StateB2::StateB2b FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ__STATEB2B_OBJ;
      StateB::StateB2 FEATURES_OBJ__STATEB_OBJ__STATEB2_OBJ;
      ShallowHistoryState FEATURES_OBJ__STATEB_OBJ__SHALLOWHISTORY_OBJ;
      DeepHistoryState FEATURES_OBJ__STATEB_OBJ__DEEPHISTORY_OBJ;
      StateB FEATURES_OBJ__STATEB_OBJ;
      // END state object
      End FEATURES_OBJ__END_OBJ;
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

}; // namespace state_machine::Features
