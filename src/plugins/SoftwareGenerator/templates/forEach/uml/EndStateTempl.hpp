/**
 * @brief This is the terminal END STATE for the HFSM, after which no
 *  events or other actions will be processed.
 */
class {{{sanitizedName}}} : public StateMachine::StateBase {
public:
  
  /**
   * @brief Empty function for the END STATE.
   */
  void entry ( void ) {}

  /**
   * @brief Empty function for the END STATE.
   */
  void exit ( void ) {}

  /**
   * @brief Empty function for the END STATE.
   */
  void tick ( void ) {}

  /**
   * @brief Empty function for the END STATE. Simply returns true
   *  since the END STATE trivially handles all events.
   *
   * @return true 
   */
  bool handleEvent ( StateMachine::Event* event ) { return true; }
};
