{{#if isState}}
/**
 * @brief Declaration for {{{fullyQualifiedName}}} : {{{path}}}
 *
 * States contain other states and can consume generic
 * StateMachine::Event objects if they have internal or external
 * transitions on those events and if those transitions' guards are
 * satisfied. Only one transition can consume an event in a given
 * state machine.
 *
 * There is also a different kind of Event, the tick event, which is
 * not consumed, but instead executes from the top-level state all
 * the way to the curently active leaf state.
 *
 * Entry and Exit actions also occur whenever a state is entered or
 * exited, respectively.
 */
class {{{sanitizedName}}} : public StateMachine::StateBase {
public:

  {{#each Substates}}
  {{> StateTemplHpp }}
  {{/each}}
  
  // Timer period
  constexpr static const double     timerPeriod = {{{this.[Timer Period]}}};

  // Constructors
  {{{sanitizedName}}}  ( void ) : StateBase( ) {}
  {{{sanitizedName}}}  ( StateBase* _parent ) : StateBase( _parent ) {}
  ~{{{sanitizedName}}} ( void ) {}

  /**
   * @brief Calls entry() then handles any child
   *  initialization. Finally calls makeActive on the leaf.
   */
  void                     initialize ( void );
    
  /**
   * @brief Runs the entry() function defined in the model.
   */
  void                     entry ( void );

  /**
   * @brief Runs the exit() function defined in the model.
   */
  void                     exit ( void );

  /**
   * @brief Runs the tick() function defined in the model and then
   *  calls _activeState->tick().
   */
  void                     tick ( void );

  /**
   * @brief The timer period of the state in floating point seconds.
   *
   * @return  double  timer period
   */
  double                   getTimerPeriod ( void );

  /**
   * @brief Calls _activeState->handleEvent( event ), then if the
   *  event is not nullptr (meaning the event was not consumed by
   *  the child subtree), it checks the event against all internal
   *  transitions associated with that Event.  If the event is still
   *  not a nullptr (meaning the event was not consumed by the
   *  internal transitions), then it checks the event against all
   *  external transitions associated with that Event.
   *
   * @param[in] StateMachine::Event* Event needing to be handled
   *
   * @return true if event is consumed, false otherwise
   */
  bool                     handleEvent ( StateMachine::Event* event );
};
{{/if}}
