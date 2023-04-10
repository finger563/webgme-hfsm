/**
 * @brief This is the terminal END STATE for the HFSM, after which no
 *  events or other actions will be processed.
 */
class {{{sanitizedName}}} : public state_machine::StateBase {
public:
  explicit {{{sanitizedName}}} ( StateBase* parent ) : StateBase(parent) {}
  void entry ( void ) {}
  void exit ( void ) {}
  void tick ( void ) {}
  // Simply returns true since the END STATE trivially handles all
  // events.
  bool handleEvent ( state_machine::EventBase* event ) { return true; }
  bool handleEvent ( GeneratedEventBase* event ) { return true; }
};
