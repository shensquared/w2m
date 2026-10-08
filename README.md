# W2M

<div align="center">
  <img src="frontend/public/w2mlogo.png" alt="W2M Logo with animal head, geometric cube, and CREATE A W2M text" width="300">
</div>

W2M is a group scheduling tool in the style of when2meet. Create an event, share the link, and everyone paints the times they are free. It runs at **https://w2m.shenshen.mit.edu**.

W2M is a fork of [Crab Fit](https://github.com/GRA0007/crab.fit) by [Ben Grant](https://github.com/GRA0007) and its contributors. Most of the app, including the Rust API, the Next.js frontend, the translations, and the browser extension, comes from Crab Fit.

Found a bug or have an idea? [Open an issue](https://github.com/shensquared/w2m/issues/new).

## What differs from Crab Fit

- **Three availability levels.** Each slot is *preferred*, *can if needed*, or *not available*. Click or drag to cycle a slot through the levels.
- **30-minute slots** with taller grid cells, in place of 15-minute slots.
- **VIP view.** A VIP tab lets you mark participants whose availability counts double, and shows the reweighted heatmap.
- **Copy a time slot.** Hover over a slot in the group view to see who is free, and click it to copy the time.
- **Usage instructions** on each tab.
- **Remembered names.** Recently visited events remember the name you used, so opening one fills in the login form for you.
- **W2M branding.** The landing page shows only the create form and your recent events. The Crab Fit about section, video, app download buttons, and donation links are gone.
- **API defaults.** The API listens on port 3034, and in release builds it falls back to the W2M site as its allowed origin when `FRONTEND_URL` is unset.

## Local development

You need [Rust](https://www.rust-lang.org/tools/install), [Node.js](https://nodejs.org/) 18 or later, and [Yarn](https://classic.yarnpkg.com/) 1.

### API

```bash
cd api
cargo run
```

The API listens on http://localhost:3034 and serves interactive API docs at `/docs`. With no features enabled it keeps everything in memory, so data is lost on restart. To use a database, build with the SQL adaptor, which supports Postgres, MySQL, and SQLite:

```bash
cargo run --features sql-adaptor
```

The API reads its environment from the shell or from an `api/.env` file. That file is not committed, so create it yourself.

| Variable | Needed when | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Running with `--features sql-adaptor` | Connection URL for the database, such as `postgresql://user:password@localhost:5432/w2m`. |
| `FRONTEND_URL` | Running a release build | Origin of the frontend that may call the API, used for CORS. Debug builds allow `http://localhost:1234` when it is unset. |
| `CRON_KEY` | Optional | If set, `/tasks/cleanup` only runs when the request sends a matching `X-Cron-Key` header. |

See [`api/README.md`](api/README.md) and [`api/adaptors/`](api/adaptors) for more on the API and its storage adaptors.

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

The frontend runs at http://localhost:1234 and talks to the API at http://localhost:3034. Put overrides in `frontend/.env`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API. Defaults to `http://localhost:3034`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY` | Optional. Turn on the Google Calendar import. |

Before opening a pull request, run `yarn tsc` and `yarn lint` in `frontend`, and `cargo clippy` in `api`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for more.

## License

W2M is licensed under the [GNU General Public License v3.0](LICENSE), the same license as Crab Fit.

---

**Why W2M?** Inspired by when2meet, whenisgood, and a play on "[WideTiM](https://widetim.com) wants to meet"! 🦦
