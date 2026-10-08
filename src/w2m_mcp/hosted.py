"""Hosted mode: the same tools over Streamable HTTP, behind GitHub sign-in.

Only GitHub accounts named in W2M_MCP_ALLOWED_GITHUB_USERS may use the tools.
The allowlist is checked twice: once in the browser flow right after GitHub
hands back a token, so a refused person sees why, and again on every tool call.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx2
from fastmcp.exceptions import ToolError
from fastmcp.server.auth.oauth_proxy.upstream import AsyncOAuth2Client
from fastmcp.server.auth.providers.github import GitHubProvider
from fastmcp.server.dependencies import get_access_token
from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext
from mcp.server.auth.provider import TokenError

CALLBACK_PATH = "/auth/callback"
MCP_PATH = "/mcp"
GITHUB_USER_URL = "https://api.github.com/user"


class ConfigError(ValueError):
    """A required environment variable is missing or malformed."""


@dataclass(frozen=True)
class Settings:
    base_url: str
    github_client_id: str
    github_client_secret: str
    allowed_users: frozenset[str]
    host: str = "127.0.0.1"
    port: int = 8765
    jwt_signing_key: str | None = None

    @property
    def hostname(self) -> str:
        return urlparse(self.base_url).hostname or ""


def parse_allowed_users(text: str) -> frozenset[str]:
    """Split a comma- or whitespace-separated list of GitHub logins, lowercased."""
    return frozenset(name.lower().lstrip("@") for name in text.replace(",", " ").split() if name.strip("@"))


def is_allowed(login: str | None, allowed_users: frozenset[str]) -> bool:
    """GitHub logins are case-insensitive, so compare lowercased."""
    return bool(login) and login.lower() in allowed_users


def refusal_message(login: str | None) -> str:
    who = f"GitHub user @{login}" if login else "This GitHub account"
    return f"{who} is not on the w2m-mcp allow list. Ask the owner to add you."


def load_settings(env: Mapping[str, str]) -> Settings:
    def required(name: str) -> str:
        value = env.get(name, "").strip()
        if not value:
            raise ConfigError(f"{name} must be set to run the hosted mode.")
        return value

    base_url = required("W2M_MCP_BASE_URL").rstrip("/")
    if not base_url.startswith(("https://", "http://")):
        raise ConfigError("W2M_MCP_BASE_URL must start with https:// (or http:// for local testing).")
    allowed_users = parse_allowed_users(required("W2M_MCP_ALLOWED_GITHUB_USERS"))
    try:
        port = int(env.get("W2M_MCP_PORT", "8765"))
    except ValueError as e:
        raise ConfigError("W2M_MCP_PORT must be a number.") from e
    return Settings(
        base_url=base_url,
        github_client_id=required("W2M_MCP_GITHUB_CLIENT_ID"),
        github_client_secret=required("W2M_MCP_GITHUB_CLIENT_SECRET"),
        allowed_users=allowed_users,
        host=env.get("W2M_MCP_HOST", "127.0.0.1").strip() or "127.0.0.1",
        port=port,
        jwt_signing_key=env.get("W2M_MCP_JWT_SIGNING_KEY", "").strip() or None,
    )


async def github_login(access_token: str, client: httpx2.AsyncClient | None = None) -> str | None:
    """Look up the GitHub login that an upstream access token belongs to."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json", "User-Agent": "w2m-mcp"}
    if client is None:
        async with httpx2.AsyncClient(timeout=10) as client:
            response = await client.get(GITHUB_USER_URL, headers=headers)
    else:
        response = await client.get(GITHUB_USER_URL, headers=headers)
    if response.status_code != 200:
        return None
    return response.json().get("login")


class AllowlistedUpstreamClient(AsyncOAuth2Client):
    """Refuses GitHub tokens for accounts outside the allowlist during sign-in.

    Raising here makes the proxy show the message on the browser callback page
    instead of handing the person an authorization code.
    """

    def __init__(self, allowed_users: frozenset[str], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.allowed_users = allowed_users

    async def fetch_token(self, url: str, **kwargs: Any) -> dict[str, Any]:
        token = await super().fetch_token(url, **kwargs)
        login = await github_login(token["access_token"], self._client)
        if not is_allowed(login, self.allowed_users):
            raise PermissionError(refusal_message(login))
        token["github_login"] = login
        return token


class AllowlistedGitHubProvider(GitHubProvider):
    def __init__(self, settings: Settings, **kwargs: Any) -> None:
        self.allowed_users = settings.allowed_users
        super().__init__(
            client_id=settings.github_client_id,
            client_secret=settings.github_client_secret,
            base_url=settings.base_url,
            redirect_path=CALLBACK_PATH,
            required_scopes=["read:user"],
            jwt_signing_key=settings.jwt_signing_key,
            cache_ttl_seconds=300,
            **kwargs,
        )

    def _create_upstream_oauth_client(self) -> AsyncOAuth2Client:
        base = super()._create_upstream_oauth_client()
        return AllowlistedUpstreamClient(
            self.allowed_users,
            client_id=base.client_id,
            client_secret=base.client_secret,
            token_endpoint_auth_method=base.token_endpoint_auth_method,
            timeout=base._client.timeout,
        )

    async def _extract_upstream_claims(self, idp_tokens: dict[str, Any]) -> dict[str, Any] | None:
        login = idp_tokens.get("github_login") or await github_login(idp_tokens["access_token"])
        if not is_allowed(login, self.allowed_users):
            raise TokenError("access_denied", refusal_message(login))
        return {"login": login}


def token_login(token: Any) -> str | None:
    """Pull the GitHub login out of a verified access token, whichever layer recorded it."""
    claims = getattr(token, "claims", None) or {}
    return claims.get("login") or (claims.get("upstream_claims") or {}).get("login")


class AllowlistMiddleware(Middleware):
    """Refuses every tool call from a token whose GitHub login is not on the allowlist."""

    def __init__(self, allowed_users: frozenset[str]) -> None:
        self.allowed_users = allowed_users

    async def on_call_tool(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        login = token_login(get_access_token())
        if not is_allowed(login, self.allowed_users):
            raise ToolError(refusal_message(login))
        return await call_next(context)


def build_app(settings: Settings):
    """Attach GitHub sign-in and the allowlist to the shared server and return its ASGI app."""
    from fastmcp import FastMCP

    from w2m_mcp.server import TOOLS, mcp

    hosted = FastMCP(
        mcp.name,
        instructions=mcp.instructions,
        auth=AllowlistedGitHubProvider(settings),
        middleware=[AllowlistMiddleware(settings.allowed_users)],
        tools=TOOLS,
    )
    return hosted.http_app(
        path=MCP_PATH,
        host_origin_protection=True,
        allowed_hosts=[settings.hostname],
        allowed_origins=[settings.base_url],
    )


def serve(env: Mapping[str, str]) -> None:
    import sys

    import uvicorn

    try:
        settings = load_settings(env)
    except ConfigError as e:
        sys.exit(f"w2m-mcp: {e}")
    uvicorn.run(build_app(settings), host=settings.host, port=settings.port, proxy_headers=True)
