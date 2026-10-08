# Going live

The hosted endpoint is `https://w2m-mcp.shenshen.mit.edu/mcp`. It runs on two machines:

- **portal** (`ssh portal`) runs nginx and holds the Let's Encrypt certificates for every `*.shenshen.mit.edu` name. The wildcard DNS already points `w2m-mcp.shenshen.mit.edu` at it.
- **The w2m container** (`ssh w2m`) runs the w2m API and this server, from the checkout at `~/w2m`. The server calls the API at `http://127.0.0.1:3034`, and portal's nginx forwards `w2m-mcp.shenshen.mit.edu` to the container on port 8765.

Steps 2 and 3 run on portal, steps 4 to 7 on the container. Do them in order.

## 1. Create the GitHub OAuth App

GitHub: profile menu > Settings > Developer settings > OAuth Apps > New OAuth App. Fill in exactly:

| Field | Value |
| --- | --- |
| Application name | `w2m-mcp` (anything; people see it on GitHub's consent page) |
| Homepage URL | `https://w2m-mcp.shenshen.mit.edu` |
| Application description | optional |
| Authorization callback URL | `https://w2m-mcp.shenshen.mit.edu/auth/callback` |
| Enable Device Flow | leave off |

The callback path `/auth/callback` is fixed in `src/w2m_mcp/hosted.py` (`CALLBACK_PATH`). After creating the app, copy the **Client ID** and generate a **Client secret**; both go into the environment file in step 5. The app only asks GitHub for the `read:user` scope, enough to learn the person's username.

## 2. Issue the certificate (portal)

Portal issues one Let's Encrypt certificate per host name, so this name needs its own:

```sh
sudo certbot certonly --nginx -d w2m-mcp.shenshen.mit.edu
```

This writes `/etc/letsencrypt/live/w2m-mcp.shenshen.mit.edu/{fullchain,privkey}.pem`, which the nginx block in step 3 references. Renewal happens with the other certificates.

## 3. Install the nginx block (portal)

Replace `<container address>` with the w2m container's LAN address:

```sh
curl -fsSL https://raw.githubusercontent.com/shensquared/w2m/main/mcp/deploy/nginx-w2m-mcp.conf \
  | sed 's/APP_HOST/<container address>/' | sudo tee /etc/nginx/sites-enabled/w2m-mcp >/dev/null
sudo nginx -t && sudo systemctl reload nginx
```

The block goes straight into `sites-enabled` as a regular file, like the other sites on portal, because portal keeps that folder in git. If `APP_HOST` is left in, `nginx -t` fails with "host not found in upstream".

## 4. Install the code and the systemd unit (container)

The checkout at `~/w2m` already holds this server in `mcp/`. Install uv once, then the server's dependencies:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh   # once; installs ~/.local/bin/uv
cd ~/w2m/mcp
~/.local/bin/uv sync --frozen --no-dev
~/.local/bin/uv run w2m-mcp --http   # should fail with "W2M_MCP_BASE_URL must be set"; proves the install works
```

Then install the unit:

```sh
sudo cp deploy/w2m-mcp.service /etc/systemd/system/w2m-mcp.service
sudo systemctl daemon-reload
```

Before copying the unit, check that `ExecStart` points at the `uv` that `which uv` prints for the service user, and that `WorkingDirectory` is that user's `~/w2m/mcp`. The unit listens on `0.0.0.0:8765` so portal can reach it. If that port is taken, change `W2M_MCP_PORT` in the unit and `proxy_pass` in the nginx block together.

## 5. Fill the environment file (container)

```sh
sudo mkdir -p /etc/w2m-mcp
sudo cp deploy/env.example /etc/w2m-mcp/env
sudo chown root:root /etc/w2m-mcp/env && sudo chmod 600 /etc/w2m-mcp/env
sudoedit /etc/w2m-mcp/env
```

Set these (the template explains each):

| Variable | Value |
| --- | --- |
| `W2M_MCP_BASE_URL` | `https://w2m-mcp.shenshen.mit.edu` |
| `W2M_MCP_GITHUB_CLIENT_ID` | the OAuth App's Client ID |
| `W2M_MCP_GITHUB_CLIENT_SECRET` | the OAuth App's Client secret |
| `W2M_MCP_ALLOWED_GITHUB_USERS` | GitHub usernames allowed in, comma separated |
| `W2M_MCP_JWT_SIGNING_KEY` | output of `openssl rand -hex 32` |
| `W2M_API_URL` | `http://127.0.0.1:3034`, already set in the template |

Secrets live only in this root-owned file. systemd reads it as root before switching to the service user, so the service user never needs to read it. Nothing in the repository holds a real secret, and the filled-in file must never be committed.

## 6. Start and verify (container)

```sh
sudo systemctl enable --now w2m-mcp
systemctl status w2m-mcp
journalctl -u w2m-mcp -f
```

From anywhere:

```sh
curl -i https://w2m-mcp.shenshen.mit.edu/mcp
```

A `401` with a `WWW-Authenticate: Bearer ... resource_metadata="https://w2m-mcp.shenshen.mit.edu/.well-known/oauth-protected-resource/mcp"` header means the app is up behind nginx and asking for sign-in. `curl https://w2m-mcp.shenshen.mit.edu/.well-known/oauth-authorization-server` should return JSON whose `authorization_endpoint` is `https://w2m-mcp.shenshen.mit.edu/authorize`.

Then do the end-to-end check as a listed user: `claude mcp add --transport http w2m https://w2m-mcp.shenshen.mit.edu/mcp`, run `/mcp` inside Claude Code, sign in with GitHub, and ask Claude to look up a poll. Sign in from a browser on the same machine as Claude Code, because the sign-in ends with a redirect to a `localhost` port that Claude Code listens on. To sign in from a session over SSH, add the server with `--callback-port <port>` and forward that port with `ssh -L <port>:localhost:<port>`.

## 7. Add or remove allowed GitHub users (container)

The list lives only in `W2M_MCP_ALLOWED_GITHUB_USERS` in `/etc/w2m-mcp/env`. To change it:

```sh
sudoedit /etc/w2m-mcp/env      # edit W2M_MCP_ALLOWED_GITHUB_USERS
sudo systemctl restart w2m-mcp
```

The restart takes effect at once: a newly added person can sign in, and a removed person is refused on their next tool call even if they are still signed in. Usernames are matched without regard to case, and `@` prefixes are ignored. The state directory `/var/lib/w2m-mcp` keeps client registrations and encrypted tokens across restarts, so nobody else has to sign in again.

## Updating the code

```sh
cd ~/w2m && git pull && cd mcp && ~/.local/bin/uv sync --frozen --no-dev && sudo systemctl restart w2m-mcp
```
