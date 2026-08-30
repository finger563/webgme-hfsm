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
  void   initialize ( void ) override;
  void   entry ( void ) override;
  void   exit ( void ) override;
  void   tick ( void ) override;
  double getTimerPeriod ( void ) override;
  bool   handleEvent ( EventBase* event ) override {
    return handleEvent( static_cast<GeneratedEventBase*>(event) );
  }
  virtual bool   handleEvent ( GeneratedEventBase* event );

  {{#each Substates}}
  {{> StateTemplHpp }}
  {{/each}}
};
{{/if}}
