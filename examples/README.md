# Example models

The three example machines from the WebGME `examples` seed, exported
through `SoftwareGenerator` (`<Machine>_model.json`) with their
hand-made layouts intact.

They are the same machines `sample_code/` was generated from, in the
portable JSON the CLI and the playground read:

```sh
node bin/hfsm-gen.js examples/Complex.json -o build/complex -t -e all
```

Because they carry `position`, the diagram comes out arranged the way
it is in WebGME rather than auto-laid-out. That is the point: the
layout is part of the model.

NOTE: these are exported from the *current* state of the models in
WebGME, which has moved on from `sample_code/` in one place --
Simple's INPUTEVENT guard now reads the event payload
(`buttonPressed && data.button_id == 12`) where the committed sample
still has `_root->buttonPressed`. Regenerating `sample_code/` from
these is a deliberate step, not something to do by accident.
