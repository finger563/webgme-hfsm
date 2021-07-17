#ifndef __EVENT_INCLUDE_GUARD__
#define __EVENT_INCLUDE_GUARD__

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif



namespace StateMachine {

  class COMPLEX_Event : public EventBase {
  public:
    enum class Type {
      INPUTEVENT,
    }; // ENUMS GENERATED FROM MODEL
    /**
     * @brief Constructor for initializing the type.
     */
    COMPLEX_Event ( Type t ) : _t(t) { }

    Type type ( void ) {
      return _t;
    }

  protected:
    Type _t;
  };
}


namespace StateMachine {

  class SIMPLE_Event : public EventBase {
  public:
    enum class Type {
      INPUTEVENT,
    }; // ENUMS GENERATED FROM MODEL

    /**
     * @brief Constructor for initializing the type.
     */
    SIMPLE_Event ( Type t ) : _t(t) { }

    Type type ( void ) {
      return _t;
    }

    #ifdef DEBUG_OUTPUT
    static std::string toString( SIMPLE_Event* e ) {
      std::string eventString = "";
      switch ( e->_t ) {
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
  };

  /**
   * @brief Class handling all Event creation, memory management, and
   *  ordering.
   */
  class EventFactory {
  public:
    /**
     * @brief Destructor; ensures all memory for all Events is
     * deallocated.
     */
    ~EventFactory( void ) {
      clearEvents();
    }

    /**
     * @brief Allocates new memory for a new Event of type t and adds
     * it to the Q.
     *
     * @param[in]  Event::Type  t  The type of the event to create
     */
    void                 spawnEvent   ( StateMachine::SIMPLE_Event::Type t ) {
      StateMachine::SIMPLE_Event* newEvent = new SIMPLE_Event( t );
      _eventQ.push_back( newEvent );
    }

    /**
     * @brief Frees the memory associated with the Event.
     *
     * @param[in]  Event*       e  Pointer to the event to consume
     */
    void                 consumeEvent ( StateMachine::SIMPLE_Event* e ) {
      delete e;
      e = nullptr;
    }

    /**
     * @brief Retrieves the pointer to the next event in the queue, or
     * nullptr if the Q is empty.
     *
     * @return     SIMPLE_Event*          Oldest Event that was in the Queue
     */
    StateMachine::SIMPLE_Event *getNextEvent ( void ) {
      StateMachine::SIMPLE_Event* ptr = nullptr;
      if (_eventQ.size()) {
	ptr = _eventQ.front();
	_eventQ.pop_front(); // remove the event from the Q
      }
      return ptr;
    }

    /**
     * @brief Clears the event queue and frees all memory associated
     * with the events.
     */
    void                clearEvents ( void ) {
      StateMachine::SIMPLE_Event* ptr = getNextEvent();
      while (ptr != nullptr) {
        consumeEvent( ptr );
        ptr = getNextEvent();
      }
    }

    #ifdef DEBUG_OUTPUT
    std::string         toString    ( void ) {
      std::string qStr = "[ ";
      for (int i=0; i<_eventQ.size(); i++) {
        qStr += SIMPLE_Event::toString( _eventQ[i] );
      }
      qStr += " ]";
      return qStr;
    }
    #endif

  protected:
    std::deque<StateMachine::SIMPLE_Event*> _eventQ;
  };

};

extern StateMachine::EventFactory *const eventFactory;

#endif // __EVENT_INCLUDE_GUARD__
