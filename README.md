# WebGME HFSM

[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/documentation-wiki-blue.svg?style=flat-square)](https://github.com/finger563/webgme-hfsm/wiki)
[![npm](https://img.shields.io/npm/v/webgme-hfsm.svg)](https://www.npmjs.com/package/webgme-hfsm)
[![npm](https://img.shields.io/npm/dm/webgme-hfsm.svg)](https://www.npmjs.com/package/webgme-hfsm)
[![npm](https://img.shields.io/npm/dt/webgme-hfsm.svg)](https://www.npmjs.com/package/webgme-hfsm)

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/finger563)

**Draw a state machine. Watch it run. Get C++ you would have been happy to write yourself.**

webgme-hfsm turns hierarchical state machines — the UML kind, with
nesting, history, choice pseudostates and typed event payloads — into
readable, dependency-free C++17 for embedded and desktop targets. It
simulates the machine while you are drawing it, so you find the
missing transition before you find it on hardware.

### ▶ [Try it in your browser](https://finger563.github.io/webgme-hfsm/) — no install, no account, no server

Pick *Complex* from the **Load example…** menu and press **Generate**.
Everything below happens on your own machine: edit the diagram,
simulate it, read the generated C++, download the lot. Nothing is
uploaded anywhere, and it works offline once loaded.

[![The playground comparing an edited machine against the version it was loaded from](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/playground-diff-what-changed.jpg)](https://finger563.github.io/webgme-hfsm/)

*Model on the left, diagram and simulator in the middle, and — here —
a comparison against the version this machine was loaded from.*

---

## What it produces

A state machine you drew:

```mermaid
stateDiagram-v2
state "Idle" as Idle
state "Active" as Active {
  state "Warming" as Warming
  state "Running" as Running
  [*] --> Warming
}
[*] --> Idle
Idle --> Active : START [batteryOK]
Warming --> Running : TICK [tempC >= data.target]
Active --> Idle : STOP
```

...becomes C++ you can read, with your own code where you put it:

```cpp
void Root::Active::Warming::tick ( void ) {
  // your machine's variables, in scope, by name
  [[maybe_unused]] auto &tempC = _root->tempC;
  // Tick action for this state
  //::::/m/Active/Warming::::Tick::::
  tempC = read_thermocouple();
}
```

C++17, no RTTI, and no framework to link against: a header and a
source file per machine, plus a handful of small header-only files
the generator drops beside them. Events are spawned through a
thread-safe queue and handled to completion on one thread, so an ISR
or another task can post into the machine without a lock of your own.
The same runtime ships in [espp](https://github.com/esp-cpp/espp) for
ESP32 firmware.

That diagram is not a drawing of the model, by the way: it *is* the
model, exported as Mermaid by the same tool. PlantUML and SCXML come
out too.

**Also see the [wiki](https://github.com/finger563/webgme-hfsm/wiki)**
for videos and development notes, and the UML background:
[Wikipedia](https://en.wikipedia.org/wiki/UML_state_machine),
[uml-diagrams.org](https://www.uml-diagrams.org/state-machine-diagrams.html),
[the specification](http://www.omg.org/spec/UML/).

## Two ways to use it

|  | [**Playground**](#playground-no-install-no-server) | [**WebGME server**](#the-webgme-editor) |
| --- | --- | --- |
| Install | none — [open the link](https://finger563.github.io/webgme-hfsm/) | Docker or Node + MongoDB |
| Draw and edit machines | ✅ | ✅ |
| Simulate, step events, inspect variables | ✅ | ✅ |
| Generate C++, test bench, Mermaid / PlantUML / SCXML | ✅ | ✅ |
| Compare two versions visually | ✅ | — |
| Multi-user collaborative editing, project history, undo | — | ✅ |
| Where the model lives | a `.json` file you own | a database, versioned |

They are the *same* visualizer, simulator and generator — the
playground is not a cut-down demo. `src/common/*` and the code
templates are copied into the static build verbatim, and CI fails if
the browser's output stops being byte-identical to the CLI's.

Start in the playground. Move to the server when you want several
people in one model at once.

There is also a **command line** (`hfsm-gen`, `hfsm-diff`) for
generating and diffing in CI, with no browser at all.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [What it produces](#what-it-produces)
- [Two ways to use it](#two-ways-to-use-it)
- [Features](#features)
    - [The whole UML statechart vocabulary](#the-whole-uml-statechart-vocabulary)
    - [Typed event payloads](#typed-event-payloads)
    - [Code that reads like code you wrote](#code-that-reads-like-code-you-wrote)
    - [A simulator that is honest about your model](#a-simulator-that-is-honest-about-your-model)
    - [Diffs that talk about state machines](#diffs-that-talk-about-state-machines)
    - [One implementation, three front ends](#one-implementation-three-front-ends)
    - [Exports that go somewhere useful](#exports-that-go-somewhere-useful)
    - [Also](#also)
- [Playground (no install, no server)](#playground-no-install-no-server)
- [The WebGME editor](#the-webgme-editor)
    - [Running the server](#running-the-server)
    - [Creating a HFSM](#creating-a-hfsm)
    - [Simulating a HFSM](#simulating-a-hfsm)
    - [Code Generation](#code-generation)
- [Command line](#command-line)
- [What is in this repository](#what-is-in-this-repository)
- [Deployment](#deployment)
- [The metamodel](#the-metamodel)
- [Model layout travels with the model](#model-layout-travels-with-the-model)
- [Validation & Testing](#validation--testing)
- [Use Cases](#use-cases)
- [Examples](#examples)

<!-- markdown-toc end -->

## Features

### The whole UML statechart vocabulary

Hierarchical states, internal / external / local transitions, choice
pseudostates, deep and shallow history, initial and end states —
and, where this deviates from UML on purpose, it is
[written down](docs/SEMANTICS.md) rather than left to be discovered.

### Typed event payloads

An `Event` carries typed `Field`s, readable in guards and actions as
`data.<field>` — in the simulator and in the generated C++ alike.
The generated types make an event and its payload impossible to
mismatch: the constructor is private, and only the typed
`Event<T>` subclass can pair them.

### Code that reads like code you wrote

Guards and actions refer to the machine's variables by name —
`someNumber < someValue`, not `_root->someNumber < _root->someValue`
— through zero-cost aliases the generator emits. Both spellings work,
and you get a warning when a state's declaration shadows a machine
variable.

### A simulator that is honest about your model

Step events, watch the active branch and every entry / exit / action
fire in order, enable and disable transitions, choose which guard is
true, and edit the variables and payloads the guards read while it
runs. If the model is not well formed, it says so instead of
pretending.

### Diffs that talk about state machines

Added, removed and changed states, transitions and guards — on the
diagram in the playground, and as an exit status from `hfsm-diff` in
CI. A layout-only change is *not* a change, so re-arranging a diagram
will not fail your build.

### One implementation, three front ends

The browser playground, the WebGME plugin and the command line run
the same `src/common` modules and the same templates. CI regenerates
every fixture, byte-compares the output against committed goldens,
compiles it warning-clean under `-Werror` and Address/UB sanitizers,
and diffs scripted execution traces — so the documented semantics,
the simulator and the C++ cannot quietly drift apart.

### Exports that go somewhere useful

Mermaid (GitHub renders it inline, as above), PlantUML for design
docs, SCXML for other statechart tools.

### Also

* Layout is part of the model, so a machine draws the same way in
  every front end ([why](#model-layout-travels-with-the-model))
* Models are validated before generation — structure, names, events,
  payloads, determinism ([what is checked](docs/VALIDATION.md))
* Disabled transitions are not generated
* Collaborative code editing in the WebGME editor, via
  [the CodeEditor](https://github.com/finger563/webgme-codeeditor)
* C++ today; *more languages coming*

## Playground (no install, no server)

### ▶ [finger563.github.io/webgme-hfsm](https://finger563.github.io/webgme-hfsm/)

A complete state machine workbench as a static web page. No database,
no accounts, nothing uploaded; it keeps working after you go offline,
and it is published from `main` on every push.

**Draw and edit.** Drag states, transitions, choice and history
pseudostates from the palette onto the diagram. Draw a transition by
dragging from one state to another. Right-click for the rest: add a
child, re-parent a selection, auto-arrange, set the active state.

**Edit what a state actually does.** Selecting anything opens an
inspector for its attributes — name, event, guard, entry / exit /
tick code — with C++ syntax highlighting inline and a pop-out editor
for anything longer. The pop-out shows your snippet **inside the
function it will be compiled into**, so the variables in scope are
right there instead of somewhere you have to go and look. A
transition action compiled into six different places says so, and
lets you step through all six.

![A guard being edited inside the else-if it compiles into](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/playground-code-context-guard.jpg)

*A guard is emitted inside a line, so it is framed that way: `else if (`
above what you are typing and `) {` below it.*

**Simulate it.** Spawn events, tick, restart; watch the active branch
light up and each entry / exit / action fire in order. Edit the
machine's variables and event payloads mid-run to steer the guards.

**Generate.** C++ plus an interactive test bench, and Mermaid,
PlantUML and SCXML — readable in the browser, downloadable as a set.

**Compare two versions.** *Compare…* puts another model beside this
one and marks up what changed — added in green, removed in red and
dashed, changed in amber and dotted — with a list naming each
difference. Clicking an entry takes the diagram to it. Compare
against the version you loaded to answer *what have I changed?*

![The change list naming each difference](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/playground-diff-change-list.png)

Comparing two genuinely different machines shows the other half:
whatever the older one had is put back where it used to be, so you
can see what went.

![Two different machines compared](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/playground-diff-two-machines.jpg)

More in [docs/PLAYGROUND.md](docs/PLAYGROUND.md#comparing-two-machines).

**It does not lose your work.** The model is kept per browser tab, so
a refresh — or a crash — brings back what you were editing, along
with the tab you were on and how you had the panes arranged.

Run it locally instead:

```bash
npm run web    # build + serve on http://localhost:8080
```

The one thing it cannot do is put several people in the same model at
once, with history and undo — that is what [the WebGME
editor](#the-webgme-editor) is for. Everything else is the same code:
the visualizer, the simulator and the generator are copied into the
static build verbatim, and CI fails if the browser's output stops
being byte-identical to the CLI's.

Full details in [docs/PLAYGROUND.md](docs/PLAYGROUND.md).

## The WebGME editor

Everything above, plus several people editing one model at once, a
project history you can walk back through, and undo. It needs a
server: Node.js and MongoDB, or the Docker image.

### Running the server

#### Docker

Build the dockerfile for the webgme-hfsm docker image

``` bash
docker build -t webgme-hfsm .
```

Now run the mongodb docker and the webgme-hfsm docker

``` bash
docker run --name mongo -d -p 27017:27017 mongo
docker run --name webgme-hfsm -d -p 8081:8081 --link mongo:mongo webgme-hfsm:latest
```

Or, in one step:

``` bash
docker compose up -d --build
```

#### Native

Dependencies:
* [Node.js 20](https://nodejs.org) (what CI and the Docker image use)
* [MongoDB](https://www.mongodb.com)

```bash
git clone https://github.com/finger563/webgme-hfsm
cd webgme-hfsm
npm install     # includes webgme itself, as a dev dependency
npm run setup   # bower packages for the editor's front end
npm start
```

`webgme` and the other editor packages are *optional* peer
dependencies: `npm install webgme-hfsm` for the CLI does not drag in
the editor server. A checkout gets them from `devDependencies`, which
is what the commands above rely on -- running the server and building
the playground are both checkout workflows.

Which will run the WebGME-HFSM server on **PORT 8081** of your local
machine, accepting connections on all IP addresses available to it.

Note: this requires a mongodb instance running on the machine, which
can be started with:

```bash
mongod --dbpath ${path you want for your database}
```

Once the server has been started, you can navigate (in *Chrome*) to 

```
localhost:8081
```

where the server is running. Create a WebGME project there from either
the `base` or the `examples` seed.

![Creating a new webgme project](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/new_webgme_project.gif)

### Creating a HFSM

Once a webgme project has been opened, creat a new HFSM project by dragging in a new component from the left panel.

![Creating a new HFSM project](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/new_hfsm_project.gif)

Double click on the project and then drag in a new HFSM component.

![Creating a new HFSM](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/new_hfsm.gif)

In addition to editing the HFSM through webgme, the HFSMViz can also be used. Open an HFSM and click on the HFSMViz on the left side of the screen to use this mode.

Components can be dragged into the visualizer just like in webgme, with addditional operations accessible via the right-click context menu

![Creating and editing an HFSM](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/hfsmEditing.gif)

### Simulating a HFSM

In the HFSMViz, the active state of the simulation is highlighted in
red, and the user can press the event buttons to see how the state
machine will react to that event. If any guards need to be evaluated,
a modal dialog will pop up with options for the user to select which
guard should evaluate to true at that time. The user has the option of
canceling the transition by selecting `None`. In the case that the
guards are associated with exit transitions of a choice pseudostate,
the `Default Transition` will be shown as a guard choice with no text.

![Complex state machine simulation](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/simulation.gif)

The **HFSMViz** visualizer allows the visualization of the full
HFSM. It also provides:
* An interface to see which events will be handled by the HFSM when it
  is in a selected (or active) state
* *Simulation* of the HFSM which properly traverses the transitions from
  the currently active state to the next active state when the user
  spawns an event into the simulation.
  * The visualization will even pop up dialogs asking the user which
    guard condition should be evalutated to true when the HFSM passes
    through a choice pseudostate or when multiple transitions have the
    same event trigger and different guards.
* Drag and drop external transition creation between two nodes of the
  HFSM
* *Automatic layout* and routing of the edges and nodes of the HFSM
  tree
* *Context menu* allowing the user to: 
  * Toggle the display of a state's children
  * Set the active state
  * Auto-arrange selected nodes into a grid
  * Re-parent selected nodes into the right-clicked node
  * Add a new element (which can also be done by dragging from the
    `Part Browser` and dropping onto the visualizer.)

### Code Generation

The **SoftwareGenerator** plugin supports generation of a `Project`
and it's `State Machines` into executable code, with the option of
generating test-bench code for interactively testing out the generated
HFSM and tracing through which actions occur in what order when an
event is spawned.

You can edit the code attributes for the `State Machines`, `States`,
`Internal Transitions`, and `External Transitions` within the
CodeEditor visualizer.

The same generation runs [from the command line](#command-line) with
no server involved.

#### Test Bench Code

When the test code is generated, it generates a `Makefile` which
builds a `test` and `DEBUG` target for each of the `State Machines` in
the `Project` from which the plugin was executed. These test bench
codes compile in (using a preprocessor define `DEBUG_OUTPUT`) logging
code which traces when transitions are fired, which guards are true,
which actions are executed, and which events are in the State
Machine's event queue.


<details><summary>Example Test Bench Output for the Complex Example State Machine</summary><p>

```bash
jebKerman@ubuntu  ~/webgme-hfsm/exampleHFSM  make run_Complex_test_DEBUG 
Compiling Complex_test_DEBUG
g++ -o Complex_test_DEBUG Complex_test.cpp Complex_GeneratedStates.cpp    -O3 -std=c++14 -MD -MP -MF .dep/Complex_test_DEBUG.d  -DDEBUG_OUTPUT

Running Complex_test_DEBUG

./Complex_test_DEBUG
INITIAL TRANSITION::ACTION for /3/c/m
ENTRY::Complex::State_1::/3/c/Y
SerialTask :: initializing State 1
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 1
[ EVENT1 ]
GUARD [ someNumber < someValue ] for INTERNAL TRANSITION:/3/c/Y/t evaluated to TRUE
Action iterating: 0
Action iterating: 1
Action iterating: 2
Action iterating: 3
Action iterating: 4
Action iterating: 5
Action iterating: 6
Action iterating: 7
Action iterating: 8
Action iterating: 9
Action iterating: 10
Action iterating: 11
Action iterating: 12
Action iterating: 13
Action iterating: 14
Action iterating: 15
Action iterating: 16
Action iterating: 17
Action iterating: 18
Action iterating: 19
Action iterating: 20
Action iterating: 21
Action iterating: 22
Action iterating: 23
Action iterating: 24
Action iterating: 25
Action iterating: 26
Action iterating: 27
Action iterating: 28
Action iterating: 29
Action iterating: 30
Action iterating: 31
Handled EVENT1
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 4
[ EVENT4 ]
GUARD [ someTest ] for EXTERNAL TRANSITION:/3/c/I evaluated to TRUE
NO GUARD on EXTERNAL TRANSITION:/3/c/o
EXIT::Complex::State_1::/3/c/Y
Exiting State 1
TRANSITION::ACTION for /3/c/I
TRANSITION::ACTION for /3/c/o
ENTRY::Complex::State3::/3/c/T
TRANSITION::ACTION for /3/c/T/I
ENTRY::Complex::State3::ChildState::/3/c/T/W
STATE TRANSITION: Complex::State_1->Complex::State3::ChildState
Handled EVENT4
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 1
[ EVENT1 ]
NO GUARD on EXTERNAL TRANSITION:/3/c/T/L
EXIT::Complex::State3::ChildState::/3/c/T/W
TRANSITION::ACTION for /3/c/T/L
ENTRY::Complex::State3::ChildState2::/3/c/T/0
STATE TRANSITION: Complex::State3::ChildState->Complex::State3::ChildState2
Handled EVENT1
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 2
[ EVENT2 ]
NO GUARD on EXTERNAL TRANSITION:/3/c/T/j
EXIT::Complex::State3::ChildState2::/3/c/T/0
TRANSITION::ACTION for /3/c/T/j
ENTRY::Complex::State3::ChildState3::/3/c/T/w
STATE TRANSITION: Complex::State3::ChildState2->Complex::State3::ChildState3
Handled EVENT2
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 3
[ EVENT3 ]
NO GUARD on EXTERNAL TRANSITION:/3/c/T/p
EXIT::Complex::State3::ChildState3::/3/c/T/w
TRANSITION::ACTION for /3/c/T/p
ENTRY::Complex::State3::ChildState::/3/c/T/W
STATE TRANSITION: Complex::State3::ChildState3->Complex::State3::ChildState
Handled EVENT3
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 4
[ EVENT4 ]
NO GUARD on EXTERNAL TRANSITION:/3/c/w
EXIT::Complex::State3::ChildState::/3/c/T/W
EXIT::Complex::State3::/3/c/T
TRANSITION::ACTION for /3/c/w
ENTRY::Complex::State_2::/3/c/v
ENTRY::Complex::State_2::ChildState::/3/c/v/K
STATE TRANSITION: Complex::State3->Complex::State_2::Deep_History_Pseudostate
Handled EVENT4
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 4
[ EVENT4 ]
NO GUARD on EXTERNAL TRANSITION:/3/c/Q
EXIT::Complex::State_2::ChildState::/3/c/v/K
EXIT::Complex::State_2::/3/c/v
TRANSITION::ACTION for /3/c/Q
ENTRY::Complex::State3::/3/c/T
ENTRY::Complex::State3::ChildState::/3/c/T/W
STATE TRANSITION: Complex::State_2->Complex::State3::Deep_History_Pseudostate
Handled EVENT4
Select which event to spawn:
0. ENDEVENT
1. EVENT1
2. EVENT2
3. EVENT3
4. EVENT4
5. INPUTEVENT
6. None
selection: 6

Finished
```

</p></details>

## Command line

Neither the editor nor a browser is required to generate. `hfsm-gen`
runs the same pipeline against a plain JSON model — the format the
playground loads and saves, and the one the plugin writes next to the
generated code:

```sh
node bin/hfsm-gen.js my_machine.json -o out --test-bench --export all
```

Out comes the C++, an interactive test bench, and Mermaid / PlantUML /
SCXML. Commit the model next to your firmware and regenerate on every
build; there is nothing to install but Node.

`hfsm-diff` answers the question a text diff cannot — *did this
change the machine?*

```
$ node bin/hfsm-diff.js before.json after.json
before.json -> after.json
  1 added, 2 changed, 15 moved
  + Extra  [State]
  ~ Waiting  [State]
      name: State 1 -> Waiting
  ~ External Transition INPUTEVENT  [External Transition]
      Guard: buttonPressed && data.button_id == 12 -> neverEver
```

It exits `0` when the machines match, `1` when they differ and `2`
when something is wrong with the input — so a CI job that treats "the
file is corrupt" as "the machine changed" is not a mistake you can
make by accident. **Dragging a state is not a change**, so reopening a
model and saving it will not fail your build.

`git diff` on the same pair reports the order the keys came out in
and the coordinates of every node you moved.

See [docs/CLI.md](docs/CLI.md) for both tools,
[docs/SEMANTICS.md](docs/SEMANTICS.md) for the exact execution
semantics the simulator and the generated code share (including the
deliberate deviations from UML), and
[docs/VALIDATION.md](docs/VALIDATION.md) for what is checked before
anything is generated.

## What is in this repository

This repository contains the plugins, decorators, and visualizers (all
of which are WebGME Components) and the base and example seeds for
creating HFSMs with embedded c/c++ code in each state. The WebGME app
utilizes the [CodeEditor](https://github.com/finger563/webgme-codeeditor) to allow users to edit the code for the
model as if it were part of an IDE.

Together these components and (meta-)modeling environment make up the
*State Machine Domain* for WebGME.

The [Base seed](./src/seeds/base.webgmex) contains just the `Meta`
definitions for the projects and HFSMs following the UML State Diagram
specification and the [Examples Seed](./src/seeds/examples.webgmex)
contains a project with three different HFSMs: *simple*, *medium*, and
*complex* — the same three the playground offers under **Load
example…**, and the same three CI compiles and runs on every push.

HFSMs are trees, where a state may have zero or more substates.
 
In this modeling paradigm, `Projects` can contain any number of `State
Machines`.

State Machines have the following attributes:

* `Includes` : include statements for the HFSM, will be at the top of
  the generated header
* `Initialization` : initialization code run at the beginning of the
  HFSM, before any of the state initialization code.
* `Declarations` : variable/function/class declarations within the
  HFSM's `StateMachine` namespace, will be within the generated header
  file
* `Definitions` : variable/function/class definitions within the
  HFSM's `StateMachine` namespace, will be within the generated source
  file
  
## Deployment

GitHub Pages cannot host the *editor* (WebGME needs Node.js +
websockets and a MongoDB) — though it does host the
[playground](#playground-no-install-no-server). For the full editor, these
options work. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide,
including the checklist for public instances.

**Local (docker compose)** -- the classic setup:

```bash
docker compose up -d --build   # builds the image, starts webgme + mongo
# open http://localhost:8081
```

**GitHub Codespaces / devcontainer (one-click, zero infra)** -- the
repo ships a [devcontainer](.devcontainer/) that builds the image,
starts mongo, installs dependencies, and launches the server with
port 8081 forwarded. Open the repo in a Codespace (or "Reopen in
Container" locally) and the app comes up automatically (server logs
in `/tmp/webgme-hfsm.log`).

**Cloud hosting (always-on shared instance)** -- run the container on
any host that runs Docker images (Fly.io, Render, Railway, ...) and
point it at a managed database such as a free-tier MongoDB Atlas
cluster via the `MONGO_URI` environment variable:

```bash
docker run -d -p 8081:8081 \
  -e NODE_ENV=docker \
  -e MONGO_URI='mongodb+srv://user:pass@cluster.mongodb.net/webgme_hfsm?retryWrites=true' \
  webgme-hfsm
```

(`MONGO_URI_UI_RECORDING` optionally stores UI recordings in a
separate database; without `MONGO_URI` the container falls back to
the compose service hostname `mongo`.)

## The metamodel

What may contain what, which types a transition may join, and what
attributes each type has all live in the WebGME metamodel. That used
to make them unavailable outside the editor: the CLI and the
playground would happily generate code from a model WebGME could
never have produced -- a State Machine nested inside a State came out
as a second top-level machine.

`npm run gen:meta` reads the WebGME metamodel and writes
[`src/common/meta.json`](src/common/meta.json) (plus `meta.js`, the
same data as a module for the browser and the plugin). It is
generated by hand when the metamodel changes and committed.

`npm run check:meta` -- the same command CI runs -- fails if the
committed files have drifted from the metamodel, and also compares
the copies inside `src/seeds`, which are what actually govern a
project at runtime.

Everything non-WebGME now reads those rules instead of a hand-kept
copy of them: `resolveModel` rejects ill-typed containment and
transition endpoints, and `LocalBackend` (the WebGME-free
`ModelBackend`) offers exactly the types the editor would offer.

## Model layout travels with the model

Laying out a state chart is real work, so `position` is part of the
model format rather than something the editor keeps to itself. The
`SoftwareGenerator` plugin writes `<Machine>_model.json` next to the
generated code with the layout as you left it; the CLI and the
playground read it back, so the same model draws the same way
everywhere. Models with no positions are arranged automatically.

## Validation & Testing

Models are validated before generation (structure, names, events,
payloads, determinism -- see [docs/VALIDATION.md](docs/VALIDATION.md))
and non-fatal warnings are surfaced in the CLI, the plugin, and the
simulator. CI regenerates fixture models, byte-compares the output
against committed goldens, compiles it warning-clean and under
Address/UB sanitizers, and diffs scripted execution traces -- so the
simulator's semantics, the documented semantics
([docs/SEMANTICS.md](docs/SEMANTICS.md)), and the generated C++ can
never silently drift apart. `sample_code/Simple` is regenerated from
its committed model on every CI run with a zero-drift check.

## Use Cases

* **Embedded C++ state machines**: model, simulate, and generate
  readable hierarchical state machines for firmware (ESP32 and
  friends) -- typed event payloads, history states, and a
  single-threaded dispatch contract with a thread-safe event queue
* **Codegen in CI**: commit the model JSON next to your firmware and
  regenerate with `hfsm-gen` on every build -- no WebGME server
  required
* **Living documentation**: export Mermaid diagrams straight into
  READMEs / PRs (GitHub renders them natively), PlantUML for design
  docs, SCXML for interchange with other statechart tools
* **Design reviews**: send a colleague [the playground
  link](https://finger563.github.io/webgme-hfsm/) and a `.json` file —
  they can open it, step it, and see what changed against the previous
  version without installing anything
* **Teaching**: in-model simulation with variable and payload
  inspection makes statechart behaviour explorable without compiling
  anything, on a lab machine you are not allowed to install software
  on

## Examples

The three machines below ship everywhere: as the [Examples
Seed](./src/seeds/examples.webgmex) for the WebGME editor, as
[`examples/*.json`](./examples) for the CLI, and under **Load
example…** in [the
playground](https://finger563.github.io/webgme-hfsm/) — where you can
open one and press Generate without installing anything. CI compiles
and *runs* all three on every push.

*Simple*:
![Simple State Machine](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/simple.png)

*Medium*:
![Medium State Machine](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/medium.png)

*Complex*:
![Complex State Machine](https://raw.githubusercontent.com/wiki/finger563/webgme-hfsm/images/complex.png)
