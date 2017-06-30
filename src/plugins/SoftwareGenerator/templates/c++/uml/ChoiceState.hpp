#ifndef __CHOICE_STATE_INCLUDE_GUARD__
#define __CHOICE_STATE_INCLUDE_GUARD__

#include "StateBase.hpp"

namespace StateMachine {

  /**
   * @brief Choice Pseudostates exist purely to re-implement the
   *  makeActive() function to actually set the right final state.
   */
  class ChoiceState : public StateBase {
  public:
    /**
     * @brief Updates the active state to be the result of the
     *  outgoing transitions of the choice pseudostate and their
     *  guards.
     */
    void                      makeActive ( ) {

    }
  };
};

#endif // __CHOICE_STATE_INCLUDE_GUARD__
