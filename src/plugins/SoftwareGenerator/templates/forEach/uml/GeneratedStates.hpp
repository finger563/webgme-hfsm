#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

// User Includes for the HFSM
//::::{{{path}}}::::Includes::::
{{{Includes}}}

namespace StateMachine {

  // ROOT OF THE HFSM
  class {{{sanitizedName}}} : public StateMachine::StateBase {
  public:

    // User Declarations for the HFSM
    //::::{{{path}}}::::Declarations::::
    {{{Declarations}}}

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
     * @brief Fully initializes the HFSM. Runs the HFSM Initialization
     *  code from the model, then sets the inital state and runs the
     *  initial transition and entry actions accordingly.
     */
    void                     initialize ( void );
    
    /**
     * @brief Terminates the HFSM, calling exit functions for the
     *  active leaf state upwards through its parents all the way to
     *  the root.
     */
    void                     terminate  ( void );

    /**
     * @brief Restarts the HFSM by calling terminate and then
     *  initialize.
     */
    void                     restart    ( void );

    /**
     * @brief Returns true if the HFSM has reached its END State
     */
    bool                     hasStopped ( void );

    /**
     * @brief Calls handleEvent on the activeLeaf.
     *
     * @param[in] StateMachine::Event* Event needing to be handled
     *
     * @return true if event is consumed, false otherwise
     */
    bool                     handleEvent ( StateMachine::Event* event );
  };
};

// pointers
extern StateMachine::{{{sanitizedName}}} *const {{{sanitizedName}}}_root;
{{> PointerTemplHpp this}}
{{#END}}
extern StateMachine::StateBase *const {{{pointerName}}};
{{~/END}}

#endif // __GENERATED_STATES_INCLUDE_GUARD__
