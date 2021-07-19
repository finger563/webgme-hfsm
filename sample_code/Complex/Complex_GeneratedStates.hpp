#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

// User Includes for the HFSM
//::::/c::::Includes::::
#include <stdio.h>

namespace StateMachine {

  namespace Complex {

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    class Event : public EventBase {
    public:
      enum class Type {
        ENDEVENT,
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
        case Type::ENDEVENT:
          eventString = "ENDEVENT";
          break;
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
      //::::/c::::Declarations::::
        bool goToEnd      = true;
  bool goToChoice   = true;
  bool goToHistory  = false;
  bool nextState    = false;
  bool killedState  = true;
  bool someGuard    = true;
  bool someTest     = true;

  int someNumber = 40;
  int someValue  = 50;

    public:
      // event factory for spawning / ordering events
      EventFactory eventFactory;

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
      // Declaration for State_1 : /c/Y
      class State_1 : public StateMachine::StateBase {
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
      // Declaration for State_2 : /c/v
      class State_2 : public StateMachine::StateBase {
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
        void   initialize ( void );
        void   entry ( void );
        void   exit ( void );
        void   tick ( void );
        double getTimerPeriod ( void );
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
        // Declaration for State_2::ChildState : /c/v/K
        class ChildState : public StateMachine::StateBase {
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
        // Declaration for State_2::ChildState2 : /c/v/e
        class ChildState2 : public StateMachine::StateBase {
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
        // Declaration for State_2::ChildState3 : /c/v/z
        class ChildState3 : public StateMachine::StateBase {
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
          void   initialize ( void );
          void   entry ( void );
          void   exit ( void );
          void   tick ( void );
          double getTimerPeriod ( void );
          bool   handleEvent ( StateMachine::EventBase* event ) {
            return handleEvent( static_cast<Event*>(event) );
          }
          bool   handleEvent ( Event* event );
        
          // Declaration for State_2::ChildState3::Grand : /c/v/z/6
          class Grand : public StateMachine::StateBase {
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
          // Declaration for State_2::ChildState3::Grand2 : /c/v/z/c
          class Grand2 : public StateMachine::StateBase {
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
      };
      // Declaration for State3 : /c/T
      class State3 : public StateMachine::StateBase {
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
        void   initialize ( void );
        void   entry ( void );
        void   exit ( void );
        void   tick ( void );
        double getTimerPeriod ( void );
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
        // Declaration for State3::ChildState2 : /c/T/0
        class ChildState2 : public StateMachine::StateBase {
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
        // Declaration for State3::ChildState : /c/T/W
        class ChildState : public StateMachine::StateBase {
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
        // Declaration for State3::ChildState3 : /c/T/w
        class ChildState3 : public StateMachine::StateBase {
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
      State_1 COMPLEX_OBJ__STATE_1_OBJ;
      State_2 COMPLEX_OBJ__STATE_2_OBJ;
      State_2::ChildState COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE_OBJ;
      StateMachine::DeepHistoryState COMPLEX_OBJ__STATE_2_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      State_2::ChildState2 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE2_OBJ;
      State_2::ChildState3 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ;
      State_2::ChildState3::Grand COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND_OBJ;
      State_2::ChildState3::Grand2 COMPLEX_OBJ__STATE_2_OBJ__CHILDSTATE3_OBJ__GRAND2_OBJ;
      StateMachine::ShallowHistoryState COMPLEX_OBJ__STATE_2_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      State3 COMPLEX_OBJ__STATE3_OBJ;
      State3::ChildState2 COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE2_OBJ;
      StateMachine::ShallowHistoryState COMPLEX_OBJ__STATE3_OBJ__SHALLOW_HISTORY_PSEUDOSTATE_OBJ;
      StateMachine::DeepHistoryState COMPLEX_OBJ__STATE3_OBJ__DEEP_HISTORY_PSEUDOSTATE_OBJ;
      State3::ChildState COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE_OBJ;
      State3::ChildState3 COMPLEX_OBJ__STATE3_OBJ__CHILDSTATE3_OBJ;
      // END state object
      End_State COMPLEX_OBJ__END_STATE_OBJ;
    }; // class Root

  }; // namespace Complex
}; // namespace StateMachine
