import json

import httpx
import pytest
from fastmcp import Client

from w2m_mcp import api
from w2m_mcp.server import mcp


@pytest.fixture
def anyio_backend():
    return "asyncio"


class FakeApi:
    """Stand-in for the w2m API that records each request it receives."""

    def __init__(self):
        self.routes: dict[tuple[str, str], httpx.Response] = {}
        self.requests: list[httpx.Request] = []

    def add(self, method: str, path: str, status: int = 200, body=None):
        self.routes[(method, path)] = httpx.Response(status, json=body) if body is not None else httpx.Response(status)

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.routes.get((request.method, request.url.path), httpx.Response(404))

    def last_json(self):
        return json.loads(self.requests[-1].content)


@pytest.fixture
def fake_api(monkeypatch):
    fake = FakeApi()
    monkeypatch.setattr(
        api,
        "http_client",
        lambda: httpx.AsyncClient(base_url=api.API_URL, transport=httpx.MockTransport(fake.handle)),
    )
    return fake


@pytest.fixture
async def client():
    async with Client(mcp) as c:
        yield c
