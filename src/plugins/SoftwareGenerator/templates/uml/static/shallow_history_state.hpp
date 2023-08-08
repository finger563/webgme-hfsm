#pragma once

#include "state_base.hpp"

namespace {{{namespace}}} {

  /**
   * @brief Shallow History Pseudostates exist purely to re-implement
   *  the makeActive() function to actually call
   *  _parentState->setShallowHistory()
   */
  class ShallowHistoryState : public StateBase {
  public:
    ShallowHistoryState ( ) : StateBase ( ) {}
    ShallowHistoryState ( StateBase* _parent ) : StateBase( _parent ) {}

    /**
     * @brief Calls _parentState->setShallowHistory().
     */
    void                      makeActive ( ) {
      if (_parentState) {
        _parentState->setShallowHistory();
      }
    }
  };
} // namespace {{{namespace}}}
