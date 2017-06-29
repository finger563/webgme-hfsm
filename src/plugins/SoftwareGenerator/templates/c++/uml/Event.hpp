#ifndef __EVENT_INCLUDE_GUARD
#define __EVENT_INCLUDE_GUARD

#include <queue>
#include <string>
#include <chrono>

namespace StateMachine {

  class Event {
  public:
    enum class Type { }; // ENUMS GENERATED FROM MODEL

    /**
     * Will return stringified form of the event type for debugging
     */
    std::string toString ( void );

  protected:
    std::chrono::time_point<std::chrono::system_clock> _spawnTime;
    std::chrono::time_point<std::chrono::system_clock> _consumeTime;
  };
  
  class EventFactory {
  public:
    StateMachine::Event *spawnEvent   ( StateMachine::Event::Type t );
    void                 consumeEvent ( StateMachine::Event* e );

  protected:
    std::queue<StateMachine::Event*> _eventQ;
  };

};

#endif // __EVENT_INCLUDE_GUARD
