# Contributing to webgme-hfsm

## Opening issues

Please read the [issue guidelines](./.github/ISSUE_TEMPLATE.md).

## Making pull requests

Please read the [pull request guidelines](./.github/PULL_REQUEST_TEMPLATE.md).

## GitHub labels

We use the following [labels](https://github.com/finger563/webgme-hfsm/labels) to track issues and PRs:

| Label | Purpose |
|--------|---------|
| `type: bug` | bug report confirmed by a plotly team member |
| `type: regression` | bug that introduced a change in behavior from one version to the next |
| `type: feature` | planned feature additions |
| `type: maintenance` | source code cleanup resulting in no enhancement for users |
| `type: documentation` | API doc or attribute description improvements |
| `type: community` | issue left open for community input and pull requests |
| `type: duplicate` | *self-explanatory* |
| `type: wontfix` | *self-explanatory* |
| `status: discussion needed` | Issue or PR that required discussion among maintainers before moving forward |
| `status: in progress` | PRs that required some initial feedback but not ready to merge |
| `status: reviewable` | PRs that are completed from the author's perspective |
| `status: on hold` | PRs that are put on hold |

## Development

#### Prerequisites

- git
- [node.js](https://nodejs.org/en/). We recommend using node.js v8.x, but all
  versions starting from v4 should work.  Upgrading and managing node versions
  can be easily done using [`nvm`](https://github.com/creationix/nvm) or its
  Windows alternatives.
- [`npm`](https://www.npmjs.com/) v5.x and up (which ships by default with
  node.js v8.x) to ensure that the
  [`package-lock.json`](https://docs.npmjs.com/files/package-lock.json) file is
  used and updated correctly.
- [`bower`](https://bower.io) to manage dependencies - install using `npm install -g bower`
- [`mongodb`](httsp://mongodb.com)

#### Step 1: Clone the plotly.js repo and install its dependencies

```bash
git clone https://github.com/finger563/webgme-hfsm.git
cd webgme-hfsm
npm install
```

#### Step 2: Start database

```bash
mongod --dbpath ${your database path}
```

#### Step 3: Start the test server and connect

```bash
npm start
```

Then open in Chrome http://localhost:8081/debug.html

#### Step 4: Open up the source in a text editor and start developing

A typical workflow is to make some modifications to the source, update the
test dashboard, inspect and debug the changes, then repeat.

## Repo organization

- Sources files are in `src/`
