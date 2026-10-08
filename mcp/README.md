# w2m-mcp

An MCP server for [w2m](https://w2m.shenshen.mit.edu/), a self-hosted [Crab Fit](https://github.com/GRA0007/crab.fit) scheduling poll site. It lets Claude look up polls, see who responded, find the times most people can make, and create new polls.

It runs in two ways. A hosted endpoint at `https://w2m-mcp.shenshen.mit.edu/mcp` lets designated people add it by URL in Claude Code or claude.ai after signing in with GitHub. The same code also runs locally over stdio, where Claude Code or Claude Desktop starts it on your machine when needed.

## Tools

Every tool that takes an event accepts either the event ID (`team-sync-123456`) or the full link (`https://w2m.shenshen.mit.edu/team-sync-123456`). All times are shown in the event's timezone.

| Tool | What it does |
| --- | --- |
| `get_event` | Returns the poll's name, link, timezone, creation time, and the days and times it offers. |
| `list_respondents` | Lists everyone who responded, with the times each person marked as available and as "if needed". |
| `best_times` | Ranks times by how many respondents can make them, best first. Each option lists who marked it available, who can make it only if needed, and who is missing. By default, back-to-back 30-minute slots with the same people merge into one window (`merge_adjacent`), and the top 5 come back (`limit`, up to 50). Ties go to more "available" answers over "if needed", then to longer windows, then to earlier times. |
| `create_poll` | Creates a poll and returns its shareable link. Takes either specific `dates` (`YYYY-MM-DD`) or `weekdays` (`monday` to `sunday`), a `start_hour` and `end_hour` (end is exclusive, so 9 to 17 offers 09:00 to 17:00), an IANA `timezone`, and an optional `name`. If `start_hour` is later than `end_hour`, the range wraps past midnight, as on the website. |

No tool adds or changes anyone's availability, and none touches person passwords.

## Use the hosted endpoint

The owner keeps a list of GitHub usernames allowed to use the hosted endpoint. If yours is on it, add the server by URL; nothing needs to be installed.

### In Claude Code

```sh
claude mcp add --transport http --scope user w2m https://w2m-mcp.shenshen.mit.edu/mcp
```

Then inside Claude Code run `/mcp`, pick `w2m`, and choose Authenticate. A browser tab opens on the server's consent page and then on GitHub; approve both. `claude mcp login w2m` does the same from the shell. To sign out, pick Clear authentication in the `/mcp` menu; `claude mcp remove w2m` removes the server and its tokens.

### In claude.ai

Go to Customize > Connectors, click Add, then Add custom connector. Name it `w2m`, give the URL `https://w2m-mcp.shenshen.mit.edu/mcp`, keep the detected OAuth settings (either "Use Claude's published identity" or "Register automatically" works), and click Add. Sign in with GitHub when asked. Turn the connector on in a chat with the + button under Connectors. On a Team or Enterprise plan an owner adds the connector under Organization settings > Connectors first.

### If sign-in is refused

After GitHub sign-in, anyone whose GitHub username is not on the list sees "GitHub user @name is not on the w2m-mcp allow list. Ask the owner to add you." The owner adds names as described under [Running the hosted endpoint](#running-the-hosted-endpoint).

## Run it locally

You need [uv](https://docs.astral.sh/uv/). Clone this repository, then from its root:

```sh
uv sync
```

This creates the environment in `./.venv`. Run the tests with:

```sh
uv run pytest
```

To start the server by hand, run `uv run w2m-mcp`. It logs one line to stderr and waits for a client on stdin; press Ctrl-C to stop it.

## Add the local server to Claude Code

Replace `/absolute/path/to/w2m-mcp` with where you cloned the repository:

```sh
claude mcp add --scope user w2m -- uv run --directory /absolute/path/to/w2m-mcp w2m-mcp
```

`--scope user` makes it available in every project; leave it out to add it to the current project only. Run `/mcp` inside Claude Code to check that `w2m` is connected.

## Add the local server to Claude Desktop

Add this entry to `claude_desktop_config.json` (on macOS, `~/Library/Application Support/Claude/claude_desktop_config.json`), then fully quit and reopen Claude Desktop:

```json
{
  "mcpServers": {
    "w2m": {
      "command": "/absolute/path/to/uv",
      "args": ["run", "--directory", "/absolute/path/to/w2m-mcp", "w2m-mcp"]
    }
  }
}
```

Claude Desktop starts servers with a minimal `PATH`, so give the full path to `uv` (`which uv` prints it).

## Configuration

Both modes read:

| Variable | Default | Meaning |
| --- | --- | --- |
| `W2M_API_URL` | `https://w2mapi.shenshen.mit.edu` | The Crab Fit API the server talks to. |
| `W2M_SITE_URL` | `https://w2m.shenshen.mit.edu` | The website used to build poll links. |

For the local mode, set them with `claude mcp add w2m -e W2M_API_URL=... -- ...`, or in an `"env"` object next to `"args"` in the Claude Desktop entry.

The hosted mode starts with `w2m-mcp --http` (or `W2M_MCP_TRANSPORT=http`) and also reads:

| Variable | Default | Meaning |
| --- | --- | --- |
| `W2M_MCP_BASE_URL` | required | Public URL of the endpoint, such as `https://w2m-mcp.shenshen.mit.edu`. The MCP endpoint is this plus `/mcp`. |
| `W2M_MCP_GITHUB_CLIENT_ID` | required | Client ID of the GitHub OAuth App. |
| `W2M_MCP_GITHUB_CLIENT_SECRET` | required | Client secret of the GitHub OAuth App. |
| `W2M_MCP_ALLOWED_GITHUB_USERS` | required | GitHub usernames allowed to use the tools, separated by commas or spaces; case does not matter. |
| `W2M_MCP_JWT_SIGNING_KEY` | derived from the client secret | Long random string that signs the tokens handed to MCP clients. Changing it signs everyone out. |
| `W2M_MCP_HOST` | `127.0.0.1` | Listen address. Keep it on loopback behind nginx. |
| `W2M_MCP_PORT` | `8765` | Listen port. |
| `FASTMCP_HOME` | the user data directory | Where the OAuth proxy keeps client registrations and encrypted tokens. |

## Running the hosted endpoint

The hosted mode serves the same four tools over MCP Streamable HTTP. [FastMCP](https://gofastmcp.com/)'s GitHub provider acts as the OAuth authorization server that MCP clients expect: it registers clients, shows a consent page, sends the person to GitHub, and issues its own tokens. The server learns only the person's GitHub username, which it checks against `W2M_MCP_ALLOWED_GITHUB_USERS` at sign-in and again on every tool call. Everyone else is refused with a message naming their account.

To add or remove someone, edit `W2M_MCP_ALLOWED_GITHUB_USERS` in the service's environment file (`/etc/w2m-mcp/env` on portal) and restart the service:

```sh
sudoedit /etc/w2m-mcp/env
sudo systemctl restart w2m-mcp
```

The full go-live checklist, in order, is in [deploy/README.md](deploy/README.md): create the GitHub OAuth App, issue the certificate, install the nginx block and systemd unit, fill the environment file, start and verify, and manage the allowlist. The files it installs are in [deploy/](deploy/).

## Credentials and sharing

The tools need no credentials. The w2m API is public, just like the website: anyone can view a poll and its responses if they know its ID, and anyone can create a poll. Sharing the local server with someone gives them no access beyond what the website already gives them. The hosted endpoint's GitHub sign-in limits who can run the tools through it, not what the tools can see.
