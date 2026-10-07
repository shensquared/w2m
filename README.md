# w2m-mcp

An MCP server for [w2m](https://w2m.shenshen.mit.edu/), a self-hosted [Crab Fit](https://github.com/GRA0007/crab.fit) scheduling poll site. It lets Claude look up polls, see who responded, find the times most people can make, and create new polls.

It runs locally over stdio: Claude Code or Claude Desktop starts it on your machine when needed. Nothing is hosted.

## Tools

Every tool that takes an event accepts either the event ID (`team-sync-123456`) or the full link (`https://w2m.shenshen.mit.edu/team-sync-123456`). All times are shown in the event's timezone.

| Tool | What it does |
| --- | --- |
| `get_event` | Returns the poll's name, link, timezone, creation time, and the days and times it offers. |
| `list_respondents` | Lists everyone who responded, with the times each person marked as available and as "if needed". |
| `best_times` | Ranks times by how many respondents can make them, best first. Each option lists who marked it available, who can make it only if needed, and who is missing. By default, back-to-back 30-minute slots with the same people merge into one window (`merge_adjacent`), and the top 5 come back (`limit`, up to 50). Ties go to more "available" answers over "if needed", then to longer windows, then to earlier times. |
| `create_poll` | Creates a poll and returns its shareable link. Takes either specific `dates` (`YYYY-MM-DD`) or `weekdays` (`monday` to `sunday`), a `start_hour` and `end_hour` (end is exclusive, so 9 to 17 offers 09:00 to 17:00), an IANA `timezone`, and an optional `name`. If `start_hour` is later than `end_hour`, the range wraps past midnight, as on the website. |

No tool adds or changes anyone's availability, and none touches person passwords.

## Install

You need [uv](https://docs.astral.sh/uv/). Clone this repository, then from its root:

```sh
uv sync
```

This creates the environment in `./.venv`. Run the tests with:

```sh
uv run pytest
```

To start the server by hand, run `uv run w2m-mcp`. It prints nothing and waits for a client on stdin; press Ctrl-C to stop it.

## Add it to Claude Code

Replace `/absolute/path/to/w2m-mcp` with where you cloned the repository:

```sh
claude mcp add --scope user w2m -- uv run --directory /absolute/path/to/w2m-mcp w2m-mcp
```

`--scope user` makes it available in every project; leave it out to add it to the current project only. Run `/mcp` inside Claude Code to check that `w2m` is connected.

## Add it to Claude Desktop

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

| Variable | Default | Meaning |
| --- | --- | --- |
| `W2M_API_URL` | `https://w2mapi.shenshen.mit.edu` | The Crab Fit API the server talks to. |
| `W2M_SITE_URL` | `https://w2m.shenshen.mit.edu` | The website used to build poll links. |

Set them with `claude mcp add w2m -e W2M_API_URL=... -- ...`, or in an `"env"` object next to `"args"` in the Claude Desktop entry.

## Credentials and sharing

The server needs no credentials. The w2m API is public, just like the website: anyone can view a poll and its responses if they know its ID, and anyone can create a poll. Sharing this server with someone gives them no access beyond what the website already gives them.
