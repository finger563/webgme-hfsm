/**
 * @brief This is the terminal END STATE for the HFSM, after which no
 *  events or other actions will be processed.
 */
class {{{sanitizedName}}} : public StateMachine::StateBase {
public:
  {{{sanitizedName}}} ( StateBase* parent ) : StateBase(parent) {}
  void entry ( void ) {}
  void exit ( void ) {}
  void tick ( void ) {}
  // Simply returns true since the END STATE trivially handles all
  // events.
  bool handleEvent ( StateMachine::EventBase* event ) { return true; }
};
