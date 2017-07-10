#ifndef __DEEP_HISTORY_STATE_INCLUDE_GUARD__
#define __DEEP_HISTORY_STATE_INCLUDE_GUARD__

#include "StateBase.hpp"

namespace StateMachine {

  /**
   * @brief Deep History Pseudostates exist purely to re-implement the
   *  makeActive() function to actually call
   *  _parentState->setDeepHistory()
   */
  class DeepHistoryState : public StateBase {
  public:
  
    DeepHistoryState ( ) : StateBase ( ) {}
    DeepHistoryState ( StateBase* _parent ) : StateBase( _parent ) {}

    /**
     * @brief Calls _parentState->setDeepHistory()
     */
    void                      makeActive ( ) {
      if (_parentState) {
	_parentState->setDeepHistory();
      }
    }
  };
};

#endif // __DEEP_HISTORY_STATE_INCLUDE_GUARD__
