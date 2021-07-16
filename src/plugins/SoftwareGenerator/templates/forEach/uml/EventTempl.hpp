#ifndef __EVENT_INCLUDE_GUARD__
#define __EVENT_INCLUDE_GUARD__

#include <deque>

#ifdef DEBUG_OUTPUT
#include <string>
#endif

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
  Event(Type t) : _t(t) {}

  Type type(void) { return _t; }

#ifdef DEBUG_OUTPUT
  static std::string toString(Event *e) {
    std::string eventString = "";
    switch (e->_t) {
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
  ~EventFactory(void) { clearEvents(); }

  /**
   * @brief Allocates new memory for a new Event of type t and adds
   * it to the Q.
   *
   * @param[in]  Event::Type  t  The type of the event to create
   */
  void spawnEvent(StateMachine::Event::Type t) {
    StateMachine::Event *newEvent = new Event(t);
    _eventQ.push_back(newEvent);
  }

  /**
   * @brief Frees the memory associated with the Event.
   *
   * @param[in]  Event*       e  Pointer to the event to consume
   */
  void consumeEvent(StateMachine::Event *e) {
    delete e;
    e = nullptr;
  }

  /**
   * @brief Retrieves the pointer to the next event in the queue, or
   * nullptr if the Q is empty.
   *
   * @return     Event*          Oldest Event that was in the Queue
   */
  StateMachine::Event *getNextEvent(void) {
    StateMachine::Event *ptr = nullptr;
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
  void clearEvents(void) {
    StateMachine::Event *ptr = getNextEvent();
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
  std::deque<StateMachine::Event *> _eventQ;
};

}; // namespace StateMachine

extern StateMachine::EventFactory *const eventFactory;

#endif // __EVENT_INCLUDE_GUARD__
