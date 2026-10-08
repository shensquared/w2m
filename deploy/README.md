# Going live on portal

Everything here is applied by hand on portal (`ssh portal`), because the build machine cannot log in there. Do the steps in order. The hosted endpoint is `https://w2m-mcp.shenshen.mit.edu/mcp`; the wildcard DNS already points `w2m-mcp.shenshen.mit.edu` at portal.

## 1. Create the GitHub OAuth App

GitHub: profile menu > Settings > Developer settings > OAuth Apps > New OAuth App. Fill in exactly:

| Field | Value |
| --- | --- |
| Application name | `w2m-mcp` (anything; people see it on GitHub's consent page) |
| Homepage URL | `https://w2m-mcp.shenshen.mit.edu` |
| Application description | optional |
| Authorization callback URL | `https://w2m-mcp.shenshen.mit.edu/auth/callback` |
| Enable Device Flow | leave off |

The callback path `/auth/callback` is fixed in `src/w2m_mcp/hosted.py` (`CALLBACK_PATH`). After creating the app, copy the **Client ID** and generate a **Client secret**; both go into the environment file in step 4. The app only asks GitHub for the `read:user` scope, enough to learn the person's username.

## 2. Issue the certificate

Portal issues one Let's Encrypt certificate per host name, so this name needs its own:

```sh
sudo certbot certonly --nginx -d w2m-mcp.shenshen.mit.edu
```

This writes `/etc/letsencrypt/live/w2m-mcp.shenshen.mit.edu/{fullchain,privkey}.pem`, which the nginx block in step 3 references. Renewal happens with the other certificates.

## 3. Clone the code and install the nginx block and systemd unit

```sh
cd /home/shenshen/code
git clone git@github.com:shensquared/w2m-mcp.git
cd w2m-mcp
uv sync --frozen --no-dev
uv run w2m-mcp --http   # should fail with "W2M_MCP_BASE_URL must be set"; proves the install works
```

Then install the two config files from `deploy/`:

```sh
sudo cp deploy/nginx-w2m-mcp.conf /etc/nginx/sites-available/w2m-mcp
sudo ln -s /etc/nginx/sites-available/w2m-mcp /etc/nginx/sites-enabled/w2m-mcp
sudo nginx -t && sudo systemctl reload nginx

sudo cp deploy/w2m-mcp.service /etc/systemd/system/w2m-mcp.service
sudo systemctl daemon-reload
```

Before copying the unit, check that `ExecStart` points at the `uv` that `which uv` prints on portal, and that `WorkingDirectory` matches the clone. The unit binds the app to `127.0.0.1:8765`; if that port is taken, change `W2M_MCP_PORT` in the unit and `proxy_pass` in the nginx block together.

## 4. Fill the environment file

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

Secrets live only in this root-owned file. systemd reads it as root before switching to the service user, so the service user never needs to read it. Nothing in the repository holds a real secret, and the filled-in file must never be committed.

## 5. Start and verify

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

Then do the end-to-end check as a listed user: `claude mcp add --transport http w2m https://w2m-mcp.shenshen.mit.edu/mcp`, run `/mcp` inside Claude Code, sign in with GitHub, and ask Claude to look up a poll.

## 6. Add or remove allowed GitHub users

The list lives only in `W2M_MCP_ALLOWED_GITHUB_USERS` in `/etc/w2m-mcp/env`. To change it:

```sh
sudoedit /etc/w2m-mcp/env      # edit W2M_MCP_ALLOWED_GITHUB_USERS
sudo systemctl restart w2m-mcp
```

The restart takes effect at once: a newly added person can sign in, and a removed person is refused on their next tool call even if they are still signed in. Usernames are matched without regard to case, and `@` prefixes are ignored. The state directory `/var/lib/w2m-mcp` keeps client registrations and encrypted tokens across restarts, so nobody else has to sign in again.

## Updating the code

```sh
cd /home/shenshen/code/w2m-mcp && git pull && uv sync --frozen --no-dev && sudo systemctl restart w2m-mcp
```
