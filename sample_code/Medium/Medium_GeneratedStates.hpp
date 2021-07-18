#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

// User Includes for the HFSM
//::::/o::::Includes::::


namespace StateMachine {

  namespace Medium {

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    class Event : public EventBase {
    public:
      enum class Type {
        EVENT1,
        EVENT2,
        EVENT3,
        EVENT4,
      }; // ENUMS GENERATED FROM MODEL
      Event(Type t) : _t(t) {}
      Type type(void) { return _t; }
#ifdef DEBUG_OUTPUT
      static std::string toString(Event *e) {
        std::string eventString = "";
        switch (e->_t) {
        case Type::EVENT1:
          eventString = "EVENT1";
          break;
        case Type::EVENT2:
          eventString = "EVENT2";
          break;
        case Type::EVENT3:
          eventString = "EVENT3";
          break;
        case Type::EVENT4:
          eventString = "EVENT4";
          break;
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
      //::::/o::::Declarations::::
        bool reInitialize = false;
  bool goToShallowHistory = false;
  bool goToDeepHistory = false;
  bool cycle = true;

    public:
      // event factory for spawning / ordering events
      EventFactory eventFactory;

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
      // Declaration for State3 : /o/K
      class State3 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
      };
      // Declaration for State4 : /o/q
      class State4 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
      };
      // Declaration for State2 : /o/y
      class State2 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
      };
      // Declaration for State1 : /o/r
      class State1 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
        // Declaration for State1::Child2 : /o/r/6
        class Child2 : public StateMachine::StateBase {
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
          bool   handleEvent ( StateMachine::EventBase* event ) {
            return handleEvent( static_cast<Event*>(event) );
          }
          bool   handleEvent ( Event* event );
        
          // Declaration for State1::Child2::Grand2 : /o/r/6/7
          class Grand2 : public StateMachine::StateBase {
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
            bool   handleEvent ( StateMachine::EventBase* event ) {
              return handleEvent( static_cast<Event*>(event) );
            }
            bool   handleEvent ( Event* event );
          
          };
          // Declaration for State1::Child2::Grand : /o/r/6/w
          class Grand : public StateMachine::StateBase {
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
            bool   handleEvent ( StateMachine::EventBase* event ) {
              return handleEvent( static_cast<Event*>(event) );
            }
            bool   handleEvent ( Event* event );
          
          };
        };
        // Declaration for State1::Child3 : /o/r/P
        class Child3 : public StateMachine::StateBase {
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
          bool   handleEvent ( StateMachine::EventBase* event ) {
            return handleEvent( static_cast<Event*>(event) );
          }
          bool   handleEvent ( Event* event );
        
        };
        // Declaration for State1::Child1 : /o/r/L
        class Child1 : public StateMachine::StateBase {
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
          bool   handleEvent ( StateMachine::EventBase* event ) {
            return handleEvent( static_cast<Event*>(event) );
          }
          bool   handleEvent ( Event* event );
        
        };
      };

      // END STATE
      /**
       * @brief This is the terminal END STATE for the HFSM, after which no
       *  events or other actions will be processed.
       */
      class End_State : public StateMachine::StateBase {
      public:
        End_State ( StateBase* parent ) : StateBase(parent) {}
        void entry ( void ) {}
        void exit ( void ) {}
        void tick ( void ) {}
        // Simply returns true since the END STATE trivially handles all
        // events.
        bool handleEvent ( StateMachine::EventBase* event ) { return true; }
        bool handleEvent ( Event* event ) { return true; }
      };

      // Keep a _root for easier templating, it will point to us
      Root *_root;
      // State Objects
      State3 MEDIUM_OBJ__STATE3_OBJ;
      State4 MEDIUM_OBJ__STATE4_OBJ;
      State2 MEDIUM_OBJ__STATE2_OBJ;
      State1 MEDIUM_OBJ__STATE1_OBJ;
      State1::Child2 MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ;
      State1::Child2::Grand2 MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND2_OBJ;
      State1::Child2::Grand MEDIUM_OBJ__STATE1_OBJ__CHILD2_OBJ__GRAND_OBJ;
      StateMachine::ShallowHistoryState MEDIUM_OBJ__STATE1_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      State1::Child3 MEDIUM_OBJ__STATE1_OBJ__CHILD3_OBJ;
      State1::Child1 MEDIUM_OBJ__STATE1_OBJ__CHILD1_OBJ;
      StateMachine::DeepHistoryState MEDIUM_OBJ__STATE1_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      // END state object
      End_State MEDIUM_OBJ__END_STATE_OBJ;
    }; // class Root

  }; // namespace Medium
}; // namespace StateMachine
