{{#if isState}}
// Declaration for {{{fullyQualifiedName}}} : {{{path}}}
class {{{sanitizedName}}} : public StateMachine::StateBase {
public:
  // User Declarations for the State
  //::::{{{path}}}::::Declarations::::
  {{{Declarations}}}

public:
  // Pointer to the root of the HFSM.
  Root *_root;

  // Constructors
  {{{sanitizedName}}}  ( Root* root, StateBase* parent ) : StateBase(parent), _root(root) {}
  ~{{{sanitizedName}}} ( void ) {}

  // StateBase Interface
  void   initialize ( void );
  void   entry ( void );
  void   exit ( void );
  void   tick ( void );
  double getTimerPeriod ( void );
  bool   handleEvent ( StateMachine::EventBase* event ) {
    return handleEvent( static_cast<Event*>(event) );
  }
  bool   handleEvent ( Event* event );

  {{#each Substates}}
  {{> StateTemplHpp }}
  {{/each}}
};
{{/if}}
