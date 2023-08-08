#pragma once

#include "state_base.hpp"

namespace {{{namespace}}} {

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
} // namespace {{{namespace}}}
