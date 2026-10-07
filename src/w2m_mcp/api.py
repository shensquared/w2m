"""Thin client for the w2m (Crab Fit v3) API."""

import os
from urllib.parse import quote, urlparse

import httpx
from mcp.server.mcpserver.exceptions import ToolError

API_URL = os.environ.get("W2M_API_URL", "https://w2mapi.shenshen.mit.edu").rstrip("/")
SITE_URL = os.environ.get("W2M_SITE_URL", "https://w2m.shenshen.mit.edu").rstrip("/")


class ApiError(ToolError):
    """An API failure the model can read and react to."""


def http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=API_URL, timeout=20)


def event_url(event_id: str) -> str:
    return f"{SITE_URL}/{event_id}"


def parse_event_id(event: str) -> str:
    """Accept an event ID or a w2m link and return the event ID."""
    text = event.strip()
    if "/" in text:
        parsed = urlparse(text if "://" in text else f"https://{text}")
        text = parsed.path.strip("/").split("/")[-1]
    if not text:
        raise ApiError(f"Could not find an event ID in {event!r}.")
    return text


async def _request(method: str, path: str, **kwargs) -> httpx.Response:
    try:
        async with http_client() as client:
            response = await client.request(method, path, **kwargs)
    except httpx.HTTPError as e:
        raise ApiError(f"Could not reach the w2m API at {API_URL}: {e}") from e
    if response.status_code == 429:
        raise ApiError("The w2m API is rate limiting requests. Wait a few seconds and try again.")
    return response


async def get_event(event_id: str) -> dict:
    response = await _request("GET", f"/event/{quote(event_id, safe='')}")
    if response.status_code == 404:
        raise ApiError(f"No w2m event with ID {event_id!r}.")
    if response.is_error:
        raise ApiError(f"The w2m API returned HTTP {response.status_code} for event {event_id!r}.")
    return response.json()


async def get_people(event_id: str) -> list[dict]:
    response = await _request("GET", f"/event/{quote(event_id, safe='')}/people")
    if response.status_code == 404:
        raise ApiError(f"No w2m event with ID {event_id!r}.")
    if response.is_error:
        raise ApiError(f"The w2m API returned HTTP {response.status_code} for event {event_id!r}.")
    return response.json()


async def create_event(name: str | None, times: list[str], timezone: str) -> dict:
    response = await _request("POST", "/event", json={"name": name, "times": times, "timezone": timezone})
    if response.is_error:
        raise ApiError(f"The w2m API refused to create the poll: HTTP {response.status_code} {response.text}".strip())
    return response.json()
