#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

// User Includes for the HFSM
//::::/9::::Includes::::


namespace StateMachine {

  // ROOT OF THE HFSM
  class Simple : public StateMachine::StateBase {

    // actual objects
    StateMachine::Simple::State_2 SIMPLE_OBJ__STATE_2_OBJ;
    StateMachine::Simple::State_2::State SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ;
    StateMachine::Simple::State_1 SIMPLE_OBJ__STATE_1_OBJ;

  public:

    // User Declarations for the HFSM
    //::::/9::::Declarations::::
      static bool buttonPressed;

    // Child Substates
    /**
     * @brief Declaration for Simple::State_2 : /9/v
     *
     * States contain other states and can consume generic
     * StateMachine::EventBase objects if they have internal or external
     * transitions on those events and if those transitions' guards are
     * satisfied. Only one transition can consume an event in a given
     * state machine.
     *
     * There is also a different kind of Event, the tick event, which is
     * not consumed, but instead executes from the top-level state all
     * the way to the curently active leaf state.
     *
     * Entry and Exit actions also occur whenever a state is entered or
     * exited, respectively.
     */
    class State_2 : public StateMachine::StateBase {
    public:
    
      /**
       * @brief Declaration for Simple::State_2::State : /9/v/C
       *
       * States contain other states and can consume generic
       * StateMachine::EventBase objects if they have internal or external
       * transitions on those events and if those transitions' guards are
       * satisfied. Only one transition can consume an event in a given
       * state machine.
       *
       * There is also a different kind of Event, the tick event, which is
       * not consumed, but instead executes from the top-level state all
       * the way to the curently active leaf state.
       *
       * Entry and Exit actions also occur whenever a state is entered or
       * exited, respectively.
       */
      class State : public StateMachine::StateBase {
      public:
      
        
        // Timer period
        static const double timerPeriod;
      
        // Constructors
        State  ( StateBase* root ) : StateBase( root ) {}
        State  ( StateBase* root, StateBase* parent ) : StateBase( root, parent ) {}
        ~State ( void ) {}
      
        /**
         * @brief Calls entry() then handles any child
         *  initialization. Finally calls makeActive on the leaf.
         */
        void                     initialize ( void );
          
        /**
         * @brief Runs the entry() function defined in the model.
         */
        void                     entry ( void );
      
        /**
         * @brief Runs the exit() function defined in the model.
         */
        void                     exit ( void );
      
        /**
         * @brief Runs the tick() function defined in the model and then
         *  calls _activeState->tick().
         */
        void                     tick ( void );
      
        /**
         * @brief The timer period of the state in floating point seconds.
         *
         * @return  double  timer period
         */
        double                   getTimerPeriod ( void );
      
        /**
         * @brief Calls _activeState->handleEvent( event ), then if the
         *  event is not nullptr (meaning the event was not consumed by
         *  the child subtree), it checks the event against all internal
         *  transitions associated with that Event.  If the event is still
         *  not a nullptr (meaning the event was not consumed by the
         *  internal transitions), then it checks the event against all
         *  external transitions associated with that Event.
         *
         * @param[in] StateMachine::EventBase* Event needing to be handled
         *
         * @return true if event is consumed, false otherwise
         */
        bool                     handleEvent ( StateMachine::EventBase* event );
      };
      
      // Timer period
      static const double timerPeriod;
    
      // Constructors
      State_2  ( void ) : StateBase( ) {}
      State_2  ( StateBase* _parent ) : StateBase( _parent ) {}
      ~State_2 ( void ) {}
    
      /**
       * @brief Calls entry() then handles any child
       *  initialization. Finally calls makeActive on the leaf.
       */
      void                     initialize ( void );
        
      /**
       * @brief Runs the entry() function defined in the model.
       */
      void                     entry ( void );
    
      /**
       * @brief Runs the exit() function defined in the model.
       */
      void                     exit ( void );
    
      /**
       * @brief Runs the tick() function defined in the model and then
       *  calls _activeState->tick().
       */
      void                     tick ( void );
    
      /**
       * @brief The timer period of the state in floating point seconds.
       *
       * @return  double  timer period
       */
      double                   getTimerPeriod ( void );
    
      /**
       * @brief Calls _activeState->handleEvent( event ), then if the
       *  event is not nullptr (meaning the event was not consumed by
       *  the child subtree), it checks the event against all internal
       *  transitions associated with that Event.  If the event is still
       *  not a nullptr (meaning the event was not consumed by the
       *  internal transitions), then it checks the event against all
       *  external transitions associated with that Event.
       *
       * @param[in] StateMachine::EventBase* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool                     handleEvent ( StateMachine::EventBase* event );
    };
    /**
     * @brief Declaration for Simple::State_1 : /9/Y
     *
     * States contain other states and can consume generic
     * StateMachine::EventBase objects if they have internal or external
     * transitions on those events and if those transitions' guards are
     * satisfied. Only one transition can consume an event in a given
     * state machine.
     *
     * There is also a different kind of Event, the tick event, which is
     * not consumed, but instead executes from the top-level state all
     * the way to the curently active leaf state.
     *
     * Entry and Exit actions also occur whenever a state is entered or
     * exited, respectively.
     */
    class State_1 : public StateMachine::StateBase {
    public:
    
      
      // Timer period
      static const double timerPeriod;
    
      // Constructors
      State_1  ( void ) : StateBase( ) {}
      State_1  ( StateBase* _parent ) : StateBase( _parent ) {}
      ~State_1 ( void ) {}
    
      /**
       * @brief Calls entry() then handles any child
       *  initialization. Finally calls makeActive on the leaf.
       */
      void                     initialize ( void );
        
      /**
       * @brief Runs the entry() function defined in the model.
       */
      void                     entry ( void );
    
      /**
       * @brief Runs the exit() function defined in the model.
       */
      void                     exit ( void );
    
      /**
       * @brief Runs the tick() function defined in the model and then
       *  calls _activeState->tick().
       */
      void                     tick ( void );
    
      /**
       * @brief The timer period of the state in floating point seconds.
       *
       * @return  double  timer period
       */
      double                   getTimerPeriod ( void );
    
      /**
       * @brief Calls _activeState->handleEvent( event ), then if the
       *  event is not nullptr (meaning the event was not consumed by
       *  the child subtree), it checks the event against all internal
       *  transitions associated with that Event.  If the event is still
       *  not a nullptr (meaning the event was not consumed by the
       *  internal transitions), then it checks the event against all
       *  external transitions associated with that Event.
       *
       * @param[in] StateMachine::EventBase* Event needing to be handled
       *
       * @return true if event is consumed, false otherwise
       */
      bool                     handleEvent ( StateMachine::EventBase* event );
    };

    // Constructors
    Simple  ( void ) : StateBase( ),
                       SIMPLE_OBJ__STATE_2_OBJ(this, this),
                       SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ(this, &SIMPLE_OBJ__STATE_2_OBJ),
                       SIMPLE_OBJ__STATE_1_OBJ(this, this) {}
    Simple  ( StateBase* _parent ) : StateBase( _parent ),
                                     SIMPLE_OBJ__STATE_2_OBJ(this, this),
                                     SIMPLE_OBJ__STATE_2_OBJ__STATE_OBJ(this, &SIMPLE_OBJ__STATE_2_OBJ),
                                     SIMPLE_OBJ__STATE_1_OBJ(this, this)
    {}
    ~Simple ( void ) {}
    
    /**
     * @brief Fully initializes the HFSM. Runs the HFSM Initialization
     *  code from the model, then sets the inital state and runs the
     *  initial transition and entry actions accordingly.
     */
    void                     initialize ( void );
    
    /**
     * @brief Terminates the HFSM, calling exit functions for the
     *  active leaf state upwards through its parents all the way to
     *  the root.
     */
    void                     terminate  ( void );

    /**
     * @brief Restarts the HFSM by calling terminate and then
     *  initialize.
     */
    void                     restart    ( void );

    /**
     * @brief Returns true if the HFSM has reached its END State
     */
    bool                     hasStopped ( void );

    /**
     * @brief Calls handleEvent on the activeLeaf.
     *
     * @param[in] StateMachine::EventBase* Event needing to be handled
     *
     * @return true if event is consumed, false otherwise
     */
    bool                     handleEvent ( StateMachine::EventBase* event );
  };
};

#endif // __GENERATED_STATES_INCLUDE_GUARD__
