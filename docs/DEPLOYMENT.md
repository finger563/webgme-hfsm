# Deploying WebGME-HFSM

WebGME-HFSM is a Node.js server (Express + websockets) backed by
MongoDB, so it cannot run on a static host such as GitHub Pages. The
options below cover local development, per-user cloud instances, and
an always-on shared deployment.

## 1. Local: docker compose

```bash
docker compose up -d --build   # webgme-hfsm + mongo
# open http://localhost:8081
docker compose logs -f webgme-hfsm
docker compose down            # add -v to also drop the database
```

## 2. GitHub Codespaces / devcontainer

The repo ships `.devcontainer/`, which composes the base
`docker-compose.yml` (webgme + mongo) with an override that builds
the image from the repo, mounts the workspace, installs
dependencies, and starts the server with port 8081 forwarded and
opened in the browser.

- **Codespaces**: *Code → Codespaces → Create codespace*.
- **Locally (VS Code)**: *Dev Containers: Reopen in Container*.

Server logs land in `/tmp/webgme-hfsm.log` inside the container.
Restart the server after changing server-side code:

```bash
pkill -f 'node app.js'; nohup npm start > /tmp/webgme-hfsm.log 2>&1 &
```

Two details worth knowing if you edit the devcontainer:

- With multiple `-f` compose files, **relative paths resolve against
  the first file's directory** (the repo root), which is why the
  override uses `context: .` rather than `context: ..`.
- `node_modules` and `bower_components` are **named volumes** so the
  workspace mount cannot shadow the container's Linux-built
  dependencies with the host's.

## 3. Cloud hosting (always-on shared instance)

Run the container image on any Docker host (Fly.io, Render, Railway,
a VM, ...) and point it at a managed MongoDB (for example a free-tier
[MongoDB Atlas](https://www.mongodb.com/atlas) M0 cluster).

`config/config.docker.js` resolves the database in this order:

| Priority | Source | Use |
|---|---|---|
| 1 | `MONGO_URI` | full connection string, including `mongodb+srv://` Atlas URIs |
| 2 | `MONGO_PORT_27017_TCP_ADDR` / `_PORT` | legacy Docker links |
| 3 | `mongo:27017` | the compose / devcontainer service hostname |

```bash
docker run -d -p 8081:8081 \
  -e NODE_ENV=docker \
  -e MONGO_URI='mongodb+srv://user:pass@cluster.mongodb.net/webgme_hfsm?retryWrites=true&w=majority' \
  webgme-hfsm
```

`MONGO_URI_UI_RECORDING` optionally directs UI recordings to a
separate database; it defaults to `MONGO_URI`.

Checklist for a public deployment:

- **Anonymous access is on by default.** `config/config.default.js`
  sets `config.authentication.enable = true` *and*
  `config.authentication.allowGuests = true`, so an instance is
  effectively open: anyone reaching it acts as the `guest` user. Set
  `config.authentication.allowGuests = false` (and configure real
  users plus a proper JWT key pair) before exposing an instance to
  the internet.
- **Persist the blob storage.** Uploaded/generated artifacts live in
  `blob-local-storage/` inside the container; mount a volume or
  configure an external blob backend so they survive redeploys.
- **Use a database user scoped to the app's databases**, and put the
  instance behind TLS (most PaaS hosts terminate TLS for you).

## 4. GitHub Pages

Pages serves static files only -- no Node.js process, no websockets,
no database -- so the editor/server cannot be hosted there. What
Pages *can* serve today: the docs, and the generator's static
outputs (Mermaid/PlantUML/SCXML exports and sample generated code)
produced by `hfsm-gen`.

A future static "playground" -- load a model JSON, view it, simulate
it, generate code entirely client-side -- is tracked with the
Rust/WASM work: the model format and the
`resolveModel`/`checkModel`/`processor`/`declParser` modules are
already browser-safe and WebGME-independent. Collaborative editing
and persistent project storage would remain server-only.
