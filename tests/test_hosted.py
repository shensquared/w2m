import httpx2
import pytest

from w2m_mcp.hosted import (
    ConfigError,
    build_app,
    is_allowed,
    load_settings,
    parse_allowed_users,
    refusal_message,
    token_login,
)

pytestmark = pytest.mark.anyio

ENV = {
    "W2M_MCP_BASE_URL": "https://w2m-mcp.example.edu/",
    "W2M_MCP_GITHUB_CLIENT_ID": "Ov23liexample",
    "W2M_MCP_GITHUB_CLIENT_SECRET": "not-a-real-secret-but-long-enough",
    "W2M_MCP_ALLOWED_GITHUB_USERS": "alice, Bob @carol",
}


def test_parse_allowed_users_accepts_commas_spaces_and_case():
    assert parse_allowed_users("alice, Bob @carol\n dave") == {"alice", "bob", "carol", "dave"}
    assert parse_allowed_users("") == frozenset()


def test_is_allowed_ignores_case_and_refuses_unknown_or_missing_login():
    allowed = parse_allowed_users("alice,bob")
    assert is_allowed("Alice", allowed)
    assert is_allowed("bob", allowed)
    assert not is_allowed("mallory", allowed)
    assert not is_allowed("", allowed)
    assert not is_allowed(None, allowed)


def test_refusal_message_names_the_account():
    assert refusal_message("mallory") == "GitHub user @mallory is not on the w2m-mcp allow list. Ask the owner to add you."
    assert "not on the w2m-mcp allow list" in refusal_message(None)


def test_token_login_reads_either_claim_layer():
    class Token:
        def __init__(self, claims):
            self.claims = claims

    assert token_login(Token({"login": "alice"})) == "alice"
    assert token_login(Token({"upstream_claims": {"login": "bob"}})) == "bob"
    assert token_login(Token({})) is None
    assert token_login(None) is None


def test_load_settings_reads_env_and_defaults():
    settings = load_settings(ENV)
    assert settings.base_url == "https://w2m-mcp.example.edu"
    assert settings.hostname == "w2m-mcp.example.edu"
    assert settings.allowed_users == {"alice", "bob", "carol"}
    assert (settings.host, settings.port) == ("127.0.0.1", 8765)
    assert settings.jwt_signing_key is None


@pytest.mark.parametrize("missing", sorted(ENV))
def test_load_settings_requires_each_variable(missing):
    env = {k: v for k, v in ENV.items() if k != missing}
    with pytest.raises(ConfigError, match=missing):
        load_settings(env)


@pytest.fixture
def fastmcp_home(tmp_path, monkeypatch):
    """Keep the OAuth proxy's on-disk state out of the real data directory."""
    import fastmcp

    monkeypatch.setattr(fastmcp.settings, "home", tmp_path)
    return tmp_path


@pytest.fixture
def hosted_client(fastmcp_home):
    app = build_app(load_settings(ENV))
    return httpx2.AsyncClient(
        transport=httpx2.ASGITransport(app=app),
        base_url="https://w2m-mcp.example.edu",
        headers={"host": "w2m-mcp.example.edu"},
    )


async def test_hosted_app_publishes_oauth_discovery(hosted_client):
    async with hosted_client as client:
        resource = await client.get("/.well-known/oauth-protected-resource/mcp")
        assert resource.status_code == 200
        assert resource.json()["resource"] == "https://w2m-mcp.example.edu/mcp"
        assert resource.json()["authorization_servers"] == ["https://w2m-mcp.example.edu/"]

        server = await client.get("/.well-known/oauth-authorization-server")
        assert server.status_code == 200
        meta = server.json()
        assert meta["authorization_endpoint"] == "https://w2m-mcp.example.edu/authorize"
        assert meta["token_endpoint"] == "https://w2m-mcp.example.edu/token"
        assert meta["registration_endpoint"] == "https://w2m-mcp.example.edu/register"


async def test_hosted_app_refuses_unauthenticated_mcp_requests(hosted_client):
    async with hosted_client as client:
        response = await client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            headers={"accept": "application/json, text/event-stream"},
        )
        assert response.status_code == 401
        assert "resource_metadata=" in response.headers["www-authenticate"]


async def test_hosted_app_rejects_wrong_host_header(hosted_client):
    async with hosted_client as client:
        response = await client.get("/.well-known/oauth-authorization-server", headers={"host": "evil.example.com"})
        assert response.status_code == 421


async def test_middleware_refuses_logins_outside_the_allowlist(monkeypatch):
    from w2m_mcp import hosted

    class Token:
        def __init__(self, login):
            self.claims = {"login": login}

    calls = []

    async def call_next(context):
        calls.append(context)
        return "ok"

    middleware = hosted.AllowlistMiddleware(parse_allowed_users("alice"))

    monkeypatch.setattr(hosted, "get_access_token", lambda: Token("Alice"))
    assert await middleware.on_call_tool("ctx", call_next) == "ok"

    monkeypatch.setattr(hosted, "get_access_token", lambda: Token("mallory"))
    with pytest.raises(hosted.ToolError, match="@mallory is not on the w2m-mcp allow list"):
        await middleware.on_call_tool("ctx", call_next)

    monkeypatch.setattr(hosted, "get_access_token", lambda: None)
    with pytest.raises(hosted.ToolError, match="not on the w2m-mcp allow list"):
        await middleware.on_call_tool("ctx", call_next)
    assert calls == ["ctx"]


def fake_github(login: str):
    """Answer GitHub's token endpoint and /user without the network."""

    def handle(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/login/oauth/access_token":
            return httpx2.Response(200, json={"access_token": "gho_test", "token_type": "bearer", "scope": "read:user"})
        if request.url.path == "/user":
            assert request.headers["authorization"] == "Bearer gho_test"
            return httpx2.Response(200, json={"login": login, "id": 1})
        return httpx2.Response(404)

    return httpx2.MockTransport(handle)


async def test_sign_in_refuses_accounts_outside_the_allowlist(fastmcp_home):
    from w2m_mcp.hosted import AllowlistedGitHubProvider

    provider = AllowlistedGitHubProvider(load_settings(ENV))
    for login, ok in [("Alice", True), ("mallory", False)]:
        client = provider._create_upstream_oauth_client()
        client._client = httpx2.AsyncClient(transport=fake_github(login))
        if ok:
            token = await client.fetch_token("https://github.com/login/oauth/access_token", code="c", redirect_uri="r")
            assert token["github_login"] == "Alice"
            assert await provider._extract_upstream_claims(token) == {"login": "Alice"}
        else:
            with pytest.raises(PermissionError, match="@mallory is not on the w2m-mcp allow list"):
                await client.fetch_token("https://github.com/login/oauth/access_token", code="c", redirect_uri="r")
        await client.aclose()
