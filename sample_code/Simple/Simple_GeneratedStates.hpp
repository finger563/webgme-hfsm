#pragma once

#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"
#include "StateBase.hpp"

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

// User Includes for the HFSM
//::::/9::::Includes::::


namespace StateMachine {

  namespace Simple {

    /**
     * @brief Class representing all events that this HFSM can respond
     * to / handle. Intended to be created / managed by the
     * EventFactory (below).
     */
    class Event : public EventBase {
    public:
      enum class Type {
        INPUTEVENT,
      }; // ENUMS GENERATED FROM MODEL
      Event(Type t) : _t(t) {}
      Type type(void) { return _t; }
#ifdef DEBUG_OUTPUT
      static std::string toString(Event *e) {
        std::string eventString = "";
        switch (e->_t) {
        case Type::INPUTEVENT:
          eventString = "INPUTEVENT";
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
      //::::/9::::Declarations::::
        bool buttonPressed{false};

    public:
      // event factory for spawning / ordering events
      EventFactory eventFactory;

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
      // Declaration for State_2 : /9/v
      class State_2 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
        // Declaration for State_2::State : /9/v/C
        class State : public StateMachine::StateBase {
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
          bool   handleEvent ( StateMachine::EventBase* event ) {
            return handleEvent( static_cast<Event*>(event) );
          }
          bool   handleEvent ( Event* event );
        
        };
      };
      // Declaration for State_1 : /9/Y
      class State_1 : public StateMachine::StateBase {
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
        bool   handleEvent ( StateMachine::EventBase* event ) {
          return handleEvent( static_cast<Event*>(event) );
        }
        bool   handleEvent ( Event* event );
      
      };

      // END STATE

      // Keep a _root for easier templating, it will point to us
      Root *_root;
      // State Objects
      State_2 SIMPLE_OBJ__STATE_2_OBJ;
      State_2::State SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ;
      State_1 SIMPLE_OBJ__STATE_1_OBJ;
    }; // class Root

  }; // namespace Simple
}; // namespace StateMachine
