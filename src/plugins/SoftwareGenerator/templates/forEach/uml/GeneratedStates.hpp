#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

namespace StateMachine {

  // User Declarations for the HFSM
  {{{Declarations}}}

  // ROOT OF THE HFSM
  class {{{sanitizedName}}} : public StateMachine::StateBase {
  public:

    // Child Substates
    {{#each Substates}}
    {{> StateTemplHpp }}
    {{/each}}
    {{#END}}
    // END STATE
    {{> EndStateTemplHpp}}
    {{~/END}}

    // Constructors
    {{{sanitizedName}}}  ( void ) : StateBase( ) {}
    {{{sanitizedName}}}  ( StateBase* _parent ) : StateBase( _parent ) {}
    ~{{{sanitizedName}}} ( void ) {}
    
    /**
     * @brief Calls handleEvent on the activeLeaf.
     *
     * @param[in] StateMachine::Event* Event needing to be handled
     *
     * @return true if event is consumed, false otherwise
     */
    bool                     handleEvent ( StateMachine::Event* event );

    /**
     * @brief Will be known from the model so will be generated in
     *  derived classes to immediately return the correct initial
     *  state pointer for quickly transitioning to the proper state
     *  during external transition handling.
     *
     * @return StateBase*  Pointer to initial substate
     */
    StateMachine::StateBase* getInitial ( void );

    /**
     * @brief Will be generated with the child init transition
     *  Action. This function will be called whenever shallow history
     *  is set.
     */
    void                     runChildInitTransAction ( void );
  };
};

// pointers
extern StateMachine::StateBase *const root;
{{> PointerTemplHpp this}}
{{#END}}
extern StateMachine::StateBase *const {{{pointerName}}};
{{~/END}}

#endif // __GENERATED_STATES_INCLUDE_GUARD__
