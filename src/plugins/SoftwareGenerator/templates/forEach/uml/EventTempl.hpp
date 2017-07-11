#ifndef __EVENT_INCLUDE_GUARD__
#define __EVENT_INCLUDE_GUARD__

#include <queue>
#include <string>
#include <chrono>

namespace StateMachine {

  class Event {
  public:
    enum class Type {
      {{#each eventNames}}
      {{{.}}},
      {{/each}}
    }; // ENUMS GENERATED FROM MODEL

    /**
     * @brief Constructor for initializing the type.
     */
    Event ( Type t ) : _t(t) { }

    Type type ( void ) {
      return _t;
    }

    /**
     * @brief Spawn the event. This sets the event's spawn time.
     */
    void spawn ( void ) {
      _spawnTime = std::chrono::system_clock::now();
    }

    /**
     * @brief Consume the event. This sets the event's consume time.
     */
    void consume ( void ) {
      _consumeTime = std::chrono::system_clock::now();
    }

    double waitTime ( void ) {
      return (_consumeTime - _spawnTime).count();
    }

    /**
     * Will return stringified form of the event for debugging
     */
    static std::string toString ( Event* e ) {
      std::string eventString = "";
      switch ( e->_t ) {
	{{#each eventNames}}
      case Type::{{{.}}}:
          eventString = "{{{.}}}";
	  break;
	{{/each}}
      default:
	break;
      }
      return eventString;
    }

  protected:
    std::chrono::time_point<std::chrono::system_clock> _spawnTime;
    std::chrono::time_point<std::chrono::system_clock> _consumeTime;
    Type                                               _t;
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
    void                 spawnEvent   ( StateMachine::Event::Type t ) {
      StateMachine::Event* newEvent = new Event( t );
      newEvent->spawn();
      _eventQ.push( newEvent );
    }

    /**
     * @brief Frees the memory associated with the Event.
     *
     * @param[in]  Event*       e  Pointer to the event to consume
     */
    void                 consumeEvent ( StateMachine::Event* e ) {
      delete e;
      e = nullptr;
    }

    /**
     * @brief Retrieves the pointer to the next event in the queue, or
     * nullptr if the Q is empty.
     *
     * @return     Event*          Oldest Event that was in the Queue
     */
    StateMachine::Event *getNextEvent ( void ) {
      StateMachine::Event* ptr = nullptr;
      if (_eventQ.size()) {
	ptr = _eventQ.front();
	_eventQ.pop(); // remove the event from the Q
      }
      return ptr;
    }

    /**
     * @brief Clears the event queue and frees all memory associated
     * with the events.
     */
    void                clearEvents ( void ) {
      StateMachine::Event* ptr = getNextEvent();
      while (ptr != nullptr) {
	consumeEvent( ptr );
	ptr = getNextEvent();
      }
    }

  protected:
    std::queue<StateMachine::Event*> _eventQ;
  };

};

#endif // __EVENT_INCLUDE_GUARD__
