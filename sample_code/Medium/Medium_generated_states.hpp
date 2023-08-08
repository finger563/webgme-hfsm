#pragma once

#include "state_base.hpp"
#include "deep_history_state.hpp"
#include "shallow_history_state.hpp"

#include <functional>
#include <deque>
#include <string>
#include <mutex>
#include "magic_enum.hpp"
#include "Medium_event_data.hpp"

// User Includes for the HFSM
//::::/o::::Includes::::


namespace state_machine::Medium {

    typedef std::function<void(std::string_view)> LogCallback;

    enum class EventType {
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

      void spawn_EVENT1_event(const EVENT1EventData &data) {
        log("\033[32mSPAWN: EVENT1\033[0m");
        GeneratedEventBase *new_event = new EVENT1Event{EventType::EVENT1, data};
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT2_event(const EVENT2EventData &data) {
        log("\033[32mSPAWN: EVENT2\033[0m");
        GeneratedEventBase *new_event = new EVENT2Event{EventType::EVENT2, data};
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT3_event(const EVENT3EventData &data) {
        log("\033[32mSPAWN: EVENT3\033[0m");
        GeneratedEventBase *new_event = new EVENT3Event{EventType::EVENT3, data};
        std::lock_guard<std::mutex> lock(queue_mutex_);
        events_.push_back(new_event);
        queue_cv_.notify_one();
      }
      void spawn_EVENT4_event(const EVENT4EventData &data) {
        log("\033[32mSPAWN: EVENT4\033[0m");
        GeneratedEventBase *new_event = new EVENT4Event{EventType::EVENT4, data};
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
      //::::/o::::Declarations::::
        bool reInitialize{false};
  bool goToShallowHistory{false};
  bool goToDeepHistory{true};
  bool cycle{true};

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
      void spawn_EVENT1_event(const EVENT1EventData &data) { event_factory.spawn_EVENT1_event(data); }
      void spawn_EVENT2_event(const EVENT2EventData &data) { event_factory.spawn_EVENT2_event(data); }
      void spawn_EVENT3_event(const EVENT3EventData &data) { event_factory.spawn_EVENT3_event(data); }
      void spawn_EVENT4_event(const EVENT4EventData &data) { event_factory.spawn_EVENT4_event(data); }

      // Constructors
      Root() : StateBase(),
      MEDIUM_OBJ__STATE3_OBJ ( this, this ),
            MEDIUM_OBJ__STATE4_OBJ ( this, this ),
            MEDIUM_OBJ__STATE2_OBJ ( this, this ),
                        MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ ( this, &MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ ),
                        MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ ( this, &MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ ),
                        MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ ( this, &MEDIUM_OBJ__STATE1_OBJ ),
                  MEDIUM_OBJ__STATE1_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ ( &MEDIUM_OBJ__STATE1_OBJ ),
            MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ ( this, &MEDIUM_OBJ__STATE1_OBJ ),
                  MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ ( this, &MEDIUM_OBJ__STATE1_OBJ ),
                  MEDIUM_OBJ__STATE1_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ ( &MEDIUM_OBJ__STATE1_OBJ ),
      MEDIUM_OBJ__STATE1_OBJ ( this, this ),
            MEDIUM_OBJ__END_STATE_OBJ ( this ),
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
      // Declaration for State3 : /o/K
      class State3 : public StateBase {
      public:
        // User Declarations for the State
        //::::/o/K::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State3  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State3 ( void ) {}
      
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
      // Declaration for State4 : /o/q
      class State4 : public StateBase {
      public:
        // User Declarations for the State
        //::::/o/q::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State4  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State4 ( void ) {}
      
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
      // Declaration for State2 : /o/y
      class State2 : public StateBase {
      public:
        // User Declarations for the State
        //::::/o/y::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State2 ( void ) {}
      
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
      // Declaration for State1 : /o/r
      class State1 : public StateBase {
      public:
        // User Declarations for the State
        //::::/o/r::::Declarations::::
        
      
      public:
        // Pointer to the root of the HFSM.
        Root *_root;
      
        // Constructors
        State1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
        ~State1 ( void ) {}
      
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
      
        // Declaration for State1::Child2 : /o/r/6
        class Child2 : public StateBase {
        public:
          // User Declarations for the State
          //::::/o/r/6::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          Child2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~Child2 ( void ) {}
        
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
        
          // Declaration for State1::Child2::Grand2 : /o/r/6/7
          class Grand2 : public StateBase {
          public:
            // User Declarations for the State
            //::::/o/r/6/7::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            Grand2  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~Grand2 ( void ) {}
          
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
          // Declaration for State1::Child2::Grand : /o/r/6/w
          class Grand : public StateBase {
          public:
            // User Declarations for the State
            //::::/o/r/6/w::::Declarations::::
            
          
          public:
            // Pointer to the root of the HFSM.
            Root *_root;
          
            // Constructors
            Grand  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
            ~Grand ( void ) {}
          
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
        // Declaration for State1::Child3 : /o/r/P
        class Child3 : public StateBase {
        public:
          // User Declarations for the State
          //::::/o/r/P::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          Child3  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~Child3 ( void ) {}
        
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
        // Declaration for State1::Child1 : /o/r/L
        class Child1 : public StateBase {
        public:
          // User Declarations for the State
          //::::/o/r/L::::Declarations::::
          
        
        public:
          // Pointer to the root of the HFSM.
          Root *_root;
        
          // Constructors
          Child1  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
          ~Child1 ( void ) {}
        
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

      // END STATE
      /**
       * @brief This is the terminal END STATE for the HFSM, after which no
       *  events or other actions will be processed.
       */
      class End_State : public StateBase {
      public:
        explicit End_State ( StateBase* parent ) : StateBase(parent) {}
        void entry ( void ) {}
        void exit ( void ) {}
        void tick ( void ) {}
        // Simply returns true since the END STATE trivially handles all
        // events.
        bool handleEvent ( EventBase* event ) { return true; }
        bool handleEvent ( GeneratedEventBase* event ) { return true; }
      };

      // State Objects
      State3 MEDIUM_OBJ__STATE3_OBJ;
      State4 MEDIUM_OBJ__STATE4_OBJ;
      State2 MEDIUM_OBJ__STATE2_OBJ;
      State1::Child2::Grand2 MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ;
      State1::Child2::Grand MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ;
      State1::Child2 MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ;
      ShallowHistoryState MEDIUM_OBJ__STATE1_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      State1::Child3 MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ;
      State1::Child1 MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ;
      DeepHistoryState MEDIUM_OBJ__STATE1_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      State1 MEDIUM_OBJ__STATE1_OBJ;
      // END state object
      End_State MEDIUM_OBJ__END_STATE_OBJ;
      // Keep a _root for easier templating, it will point to us
      Root *_root;
    }; // class Root

}; // namespace state_machine::Medium
