# W2M

<div align="center">
  <img src="frontend/public/w2mlogo.png" alt="W2M Logo with animal head, geometric cube, and CREATE A W2M text" width="300">
</div>

W2M is a group scheduling tool in the style of when2meet. Create an event, share the link, and everyone paints the times they are free. It runs at **https://w2m.shenshen.mit.edu**.

W2M is a fork of [Crab Fit](https://github.com/GRA0007/crab.fit) by [Ben Grant](https://github.com/GRA0007) and its contributors. Most of the app, including the Rust API, the Next.js frontend, the translations, and the browser extension, comes from Crab Fit.

Found a bug or have an idea? [Open an issue](https://github.com/shensquared/w2m/issues/new).

## Repository map

| Path | What it is |
| --- | --- |
| `api/` | Rust HTTP API (axum). Entry point `api/src/main.rs`, routes in `api/src/routes/`. |
| `api/common/` | Shared types and the `Adaptor` trait that storage backends implement. |
| `api/adaptors/` | Storage backends: `memory` (default), `sql` (Postgres, MySQL, SQLite), `datastore` (Google Datastore). |
| `frontend/` | Next.js 13 app router site in TypeScript and SCSS modules. Pages in `frontend/src/app/`, components in `frontend/src/components/`. |
| `frontend/src/i18n/locales/` | Translation JSON files, one folder per language. |
| `browser-extension/` | Static extension. `popup.html` is an iframe of the site's `/create` page. No build step. |
| `mcp/` | MCP server in Python that lets Claude look up polls, rank the best times, and create polls through the API. Runs locally over stdio or as a hosted endpoint with GitHub sign-in. See [`mcp/README.md`](mcp/README.md). |
| `.github/workflows/` | CI checks (`check_api.yml`, `check_frontend.yml`, `check_mcp.yml`) and deploy jobs inherited from Crab Fit. |

## Commands

Requirements: [Rust](https://www.rust-lang.org/tools/install) (stable), [Node.js](https://nodejs.org/) 18 or later (CI uses 18), and [Yarn](https://classic.yarnpkg.com/) 1. The MCP server also needs [uv](https://docs.astral.sh/uv/), which installs the Python version it pins.

### API (`api/`)

```bash
cd api
cargo run                                      # debug build, in-memory storage, http://localhost:3034
cargo run --features sql-adaptor               # store data in a database; needs DATABASE_URL
cargo build --release --features sql-adaptor   # release build
cargo clippy                                   # lint; CI runs it with RUSTFLAGS="-Dwarnings"
```

The API serves interactive OpenAPI docs at http://localhost:3034/docs. The API crates contain no tests.

### Frontend (`frontend/`)

```bash
cd frontend
yarn install --frozen-lockfile   # install dependencies
yarn dev                         # dev server, http://localhost:1234
yarn build                       # production build
yarn start                       # serve the production build on port 1234
yarn tsc                         # type check (CI)
yarn lint                        # ESLint (CI adds --max-warnings 0)
```

`frontend/package.json` has no test script. The type check and lint are the checks.

### MCP server (`mcp/`)

```bash
cd mcp
uv sync          # install into mcp/.venv
uv run pytest    # tests (CI)
uv run w2m-mcp   # run over stdio; Claude Code or Claude Desktop normally starts it
```

Setup for Claude Code, Claude Desktop, and the hosted endpoint is in [`mcp/README.md`](mcp/README.md).

### Run both locally

Start the API with `cargo run` in one terminal and the frontend with `yarn dev` in another, then open http://localhost:1234. The defaults already point the frontend at the API and let the API accept requests from the frontend, so this needs no environment variables.

## Environment variables

`api/.env` is never committed. Create it yourself, or export the variables in your shell. The API loads it with [dotenvy](https://crates.io/crates/dotenvy) at startup.

| Variable | Where | Needed when | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | `api/.env` | Running with `--features sql-adaptor` | Database connection URL, such as `postgresql://user:password@localhost:5432/w2m`. The API panics at startup if it is missing. |
| `FRONTEND_URL` | `api/.env` | Release builds | Frontend origin that CORS allows. Debug builds allow `http://localhost:1234` when it is unset. Release builds fall back to the public W2M site. |
| `CRON_KEY` | `api/.env` | Optional | If set, `GET /tasks/cleanup` requires a matching `X-Cron-Key` header. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env` | Optional | API base URL. Defaults to `http://localhost:3034`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY` | `frontend/.env` | Optional | Turn on the Google Calendar import. |

`frontend/.env.local` is committed and holds shared defaults. Put local overrides in `frontend/.env`, which git ignores. Never commit real credentials in either folder.

## Conventions and gotchas

- **Use Yarn, not npm.** Both `frontend/yarn.lock` and `frontend/package-lock.json` exist, but CI installs with Yarn and `yarn.lock` is the one kept current.
- **Ports are fixed in code.** The API port 3034 is set in `api/src/main.rs`. The frontend port 1234 is set in the `dev` and `start` scripts in `frontend/package.json`.
- **Storage is chosen at compile time** with a Cargo feature, not at runtime. With no feature, data lives in memory and is lost on restart.
- **Frontend style:** no semicolons, 2-space indentation, sorted imports (`simple-import-sort`), and imports written from the frontend root as `/src/...`. See `frontend/.eslintrc.json`.
- **Translations:** add new strings only to `frontend/src/i18n/locales/en/`. Other languages fall back to English for missing keys.
- **Server and client translation hooks:** async server components, such as the pages and `Footer`, import `useTranslation` from `/src/i18n/server`. Client components import it from `/src/i18n/client`.
- **Dates and times** use the Temporal API through `@js-temporal/polyfill`. The polyfill is slow, so the code runs Temporal logic only where it has to.
- **Files inherited from Crab Fit:** the `deploy_*.yml` workflows only run in the upstream repository. `api/Dockerfile` builds with `--features datastore-adaptor`, but the `datastore-adaptor` dependency is commented out in `api/Cargo.toml`, so that build fails as is.
- **Browser extension:** `/create` redirects to the home page unless it runs inside an iframe. To test the extension locally, point the iframe `src` in `browser-extension/popup.html` at `http://localhost:1234/create` and load the folder as an unpacked extension.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the issue and pull request process.

## What differs from Crab Fit

- **Three availability levels.** Each slot is *preferred*, *can if needed*, or *not available*. Click or drag to cycle a slot through the levels.
- **30-minute slots** with taller grid cells, in place of 15-minute slots.
- **VIP view.** A VIP tab lets you mark participants whose availability counts double, and shows the reweighted heatmap.
- **Copy a time slot.** Hover over a slot in the group view to see who is free, and click it to copy the time.
- **Usage instructions** on each tab.
- **Remembered names.** Recently visited events remember the name you used, so opening one fills in the login form for you.
- **MCP server.** `mcp/` lets Claude look up polls, see who responded, rank the times most people can make, and create polls.

## License

W2M is licensed under the [GNU General Public License v3.0](LICENSE), the same license as Crab Fit.

## Acknowledgments

Built on the foundation of [crab.fit](https://github.com/GRA0007/crab.fit) by [@GRA0007](https://github.com/GRA0007).

---

**Why W2M?** Inspired by when2meet, whenisgood, and a play on "[WideTiM](https://widetim.com) wants to meet"! 🦦
