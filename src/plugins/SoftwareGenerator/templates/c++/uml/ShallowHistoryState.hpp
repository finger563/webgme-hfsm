#ifndef __SHALLOW_HISTORY_STATE_INCLUDE_GUARD__
#define __SHALLOW_HISTORY_STATE_INCLUDE_GUARD__

#include "StateBase.hpp"

namespace StateMachine {

  /**
   * @brief Shallow History Pseudostates exist purely to re-implement
   *  the makeActive() function to actually call
   *  _parentState->setShallowHistory()
   */
  class ShallowHistoryState : public StateBase {
  public:
    /**
     * @brief Calls _parentState->setShallowHistory()
     */
    void                      makeActive ( ) {
      if (_parentState) {
	_parentState->setShallowHistory();
      }
    }
  };
};

#endif // __SHALLOW_HISTORY_STATE_INCLUDE_GUARD__
