{{#if isState}}
// Declaration for {{{fullyQualifiedName}}} : {{{path}}}
class {{{sanitizedName}}} : public StateBase {
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
  virtual bool   handleEvent ( EventBase* event ) {
    return handleEvent( static_cast<GeneratedEventBase*>(event) );
  }
  virtual bool   handleEvent ( GeneratedEventBase* event );

  {{#each Substates}}
  {{> StateTemplHpp }}
  {{/each}}
};
{{/if}}
