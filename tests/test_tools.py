from datetime import date

import pytest

from w2m_mcp import api

pytestmark = pytest.mark.anyio

# A poll over Mon 12 and Tue 13 Oct 2026, 09:00-11:00 in New York (UTC-4).
EVENT = {
    "id": "team-sync-123456",
    "name": "Team sync",
    "times": ["1300-12102026", "1400-12102026", "1300-13102026", "1400-13102026"],
    "timezone": "America/New_York",
    "created_at": 1791400000,
}
PEOPLE = [
    {
        "name": "Alice",
        "availability": [
            {"time": "1300-12102026", "level": "preferred"},
            {"time": "1330-12102026", "level": "preferred"},
            {"time": "1400-12102026", "level": "preferred"},
        ],
        "created_at": 1791400100,
    },
    {
        "name": "Bob",
        "availability": [
            {"time": "1300-12102026", "level": "preferred"},
            {"time": "1330-12102026", "level": "preferred"},
            {"time": "1400-12102026", "level": "can_if_needed"},
            {"time": "1430-12102026", "level": "not_available"},
        ],
        "created_at": 1791400200,
    },
    {"name": "Carol", "availability": ["1300-13102026"], "created_at": 1791400300},
    {
        "name": "Dave",
        "availability": [{"time": "1300-12102026", "level": "not_available"}],
        "created_at": 1791400400,
    },
]


@pytest.fixture
def team_sync(fake_api):
    fake_api.add("GET", "/event/team-sync-123456", body=EVENT)
    fake_api.add("GET", "/event/team-sync-123456/people", body=PEOPLE)
    return fake_api


async def test_get_event_accepts_link(client, team_sync):
    result = await client.call_tool("get_event", {"event": "https://w2m.shenshen.mit.edu/team-sync-123456"})
    assert not result.is_error
    assert result.structured_content == {
        "id": "team-sync-123456",
        "name": "Team sync",
        "url": "https://w2m.shenshen.mit.edu/team-sync-123456",
        "timezone": "America/New_York",
        "created_at": "2026-10-07 15:06 EDT",
        "kind": "dates",
        "times": ["Mon 12 Oct 2026: 09:00-11:00", "Tue 13 Oct 2026: 09:00-11:00"],
    }


async def test_get_event_not_found(client, fake_api):
    result = await client.call_tool("get_event", {"event": "nope-000000"})
    assert result.is_error
    assert "No w2m event with ID 'nope-000000'" in result.content[0].text


async def test_rate_limit_is_reported(client, fake_api):
    fake_api.add("GET", "/event/busy-1", status=429)
    result = await client.call_tool("get_event", {"event": "busy-1"})
    assert result.is_error
    assert "rate limiting" in result.content[0].text


async def test_list_respondents(client, team_sync):
    result = await client.call_tool("list_respondents", {"event": "team-sync-123456"})
    data = result.structured_content
    assert data["count"] == 4
    alice, bob, carol, dave = data["respondents"]
    assert alice["available"] == ["Mon 12 Oct 2026: 09:00-10:30"]
    assert bob["available"] == ["Mon 12 Oct 2026: 09:00-10:00"]
    assert bob["if_needed"] == ["Mon 12 Oct 2026: 10:00-10:30"]
    assert carol["available"] == ["Tue 13 Oct 2026: 09:00-09:30"]
    assert dave["available"] == [] and dave["if_needed"] == []
    assert alice["responded_at"] == "2026-10-07 15:08 EDT"


async def test_best_times_ranks_and_lists_missing(client, team_sync):
    result = await client.call_tool("best_times", {"event": "team-sync-123456"})
    data = result.structured_content
    assert data["respondent_count"] == 4
    assert data["options"] == [
        {
            "when": "Mon 12 Oct 2026 09:00-10:00",
            "available_count": 2,
            "available": ["Alice", "Bob"],
            "if_needed": [],
            "missing": ["Carol", "Dave"],
        },
        {
            "when": "Mon 12 Oct 2026 10:00-10:30",
            "available_count": 2,
            "available": ["Alice"],
            "if_needed": ["Bob"],
            "missing": ["Carol", "Dave"],
        },
        {
            "when": "Tue 13 Oct 2026 09:00-09:30",
            "available_count": 1,
            "available": ["Carol"],
            "if_needed": [],
            "missing": ["Alice", "Bob", "Dave"],
        },
    ]


async def test_best_times_unmerged_with_limit(client, team_sync):
    result = await client.call_tool("best_times", {"event": "team-sync-123456", "limit": 2, "merge_adjacent": False})
    assert [o["when"] for o in result.structured_content["options"]] == [
        "Mon 12 Oct 2026 09:00-09:30",
        "Mon 12 Oct 2026 09:30-10:00",
    ]


async def test_best_times_without_respondents(client, fake_api):
    fake_api.add("GET", "/event/empty-1", body=EVENT | {"id": "empty-1"})
    fake_api.add("GET", "/event/empty-1/people", body=[])
    result = await client.call_tool("best_times", {"event": "empty-1"})
    assert result.is_error
    assert "No one has responded" in result.content[0].text


async def test_create_poll_with_dates(client, fake_api):
    fake_api.add("POST", "/event", status=201, body=EVENT)
    result = await client.call_tool(
        "create_poll",
        {
            "name": "Team sync",
            "dates": ["2026-10-12", "2026-10-13"],
            "start_hour": 9,
            "end_hour": 11,
            "timezone": "America/New_York",
        },
    )
    assert not result.is_error
    assert fake_api.last_json() == {
        "name": "Team sync",
        "times": EVENT["times"],
        "timezone": "America/New_York",
    }
    assert result.structured_content["url"] == "https://w2m.shenshen.mit.edu/team-sync-123456"


async def test_create_poll_with_weekdays(client, fake_api, monkeypatch):
    monkeypatch.setattr("w2m_mcp.slots.date", type("FixedDate", (date,), {"today": classmethod(lambda cls: date(2026, 10, 7))}))
    created = {
        "id": "standup-654321",
        "name": "Standup",
        "times": ["0200-2", "0300-2"],
        "timezone": "Asia/Tokyo",
        "created_at": 1791400000,
    }
    fake_api.add("POST", "/event", status=201, body=created)
    result = await client.call_tool(
        "create_poll",
        {"name": "Standup", "weekdays": ["tuesday"], "start_hour": 11, "end_hour": 13, "timezone": "Asia/Tokyo"},
    )
    assert not result.is_error
    # 11:00 and 12:00 on Tuesday in Tokyo (UTC+9) are 02:00 and 03:00 Tuesday UTC.
    assert fake_api.last_json()["times"] == ["0200-2", "0300-2"]
    assert result.structured_content["times"] == ["Tuesday: 11:00-13:00"]


@pytest.mark.parametrize(
    "args, message",
    [
        ({"start_hour": 9, "end_hour": 11, "timezone": "UTC"}, "exactly one of dates or weekdays"),
        ({"dates": ["2026-10-12"], "start_hour": 9, "end_hour": 9, "timezone": "UTC"}, "must differ"),
        ({"dates": ["2026-10-12"], "start_hour": 9, "end_hour": 11, "timezone": "Mars/Olympus"}, "Unknown timezone"),
    ],
)
async def test_create_poll_rejects_bad_input(client, fake_api, args, message):
    result = await client.call_tool("create_poll", args)
    assert result.is_error
    assert message in result.content[0].text
    assert fake_api.requests == []


@pytest.mark.parametrize(
    "text",
    [
        "team-sync-123456",
        " https://w2m.shenshen.mit.edu/team-sync-123456 ",
        "https://w2m.shenshen.mit.edu/team-sync-123456/",
        "w2m.shenshen.mit.edu/team-sync-123456",
    ],
)
def test_parse_event_id(text):
    assert api.parse_event_id(text) == "team-sync-123456"
