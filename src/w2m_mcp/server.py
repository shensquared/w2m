"""MCP server for w2m, a self-hosted Crab Fit scheduling poll site."""

from datetime import date, datetime, timezone
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations
from pydantic import BaseModel, Field

from w2m_mcp import api
from w2m_mcp.slots import (
    Slot,
    adjacent,
    build_times,
    describe_by_day,
    describe_run,
    expand_times,
    parse_slot,
    sort_slots,
    weekday_dates,
)

mcp = MCPServer(
    "w2m",
    instructions=(
        "Tools for w2m, a when2meet-style scheduling poll site. Events are identified by an "
        "ID such as 'team-lunch-123456' or by their full link. Times are shown in the event's "
        "timezone. These tools never change anyone's availability."
    ),
)

EventArg = Annotated[
    str,
    Field(description="The event ID, such as 'team-lunch-123456', or the full w2m link to the event."),
]
READ_ONLY = ToolAnnotations(read_only_hint=True, open_world_hint=True)
Weekday = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class EventInfo(BaseModel):
    id: str
    name: str
    url: str
    timezone: str
    created_at: str = Field(description="When the poll was created, in the event's timezone.")
    kind: Literal["dates", "weekdays"] = Field(
        description="'dates' for a poll over specific dates, 'weekdays' for a poll over days of the week."
    )
    times: list[str] = Field(description="The times on offer, one line per day, in the event's timezone.")


class Respondent(BaseModel):
    name: str
    responded_at: str = Field(description="When the person first responded, in the event's timezone.")
    available: list[str] = Field(description="Times marked as available (preferred), one line per day.")
    if_needed: list[str] = Field(description="Times marked as 'can if needed', one line per day.")


class Respondents(BaseModel):
    event_id: str
    event_name: str
    url: str
    timezone: str
    count: int
    respondents: list[Respondent]


class TimeOption(BaseModel):
    when: str = Field(description="Day and time range in the event's timezone.")
    available_count: int = Field(description="How many respondents can make it, preferred or if needed.")
    available: list[str] = Field(description="Respondents who marked this time as available (preferred).")
    if_needed: list[str] = Field(description="Respondents who can make this time if needed.")
    missing: list[str] = Field(description="Respondents who cannot make this time.")


class BestTimes(BaseModel):
    event_id: str
    event_name: str
    url: str
    timezone: str
    respondent_count: int
    options: list[TimeOption] = Field(description="Best times first.")


class PollCreated(BaseModel):
    id: str
    name: str
    url: str = Field(description="Shareable link to the new poll.")
    timezone: str
    times: list[str] = Field(description="The times on offer, one line per day, in the event's timezone.")


def _zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as e:
        raise ToolError(f"Unknown timezone {name!r}. Use an IANA name such as 'America/New_York'.") from e


def _slots(event: dict) -> list[Slot]:
    tz = _zone(event["timezone"])
    raws = dict.fromkeys(expand_times(event["times"]))
    return sort_slots([parse_slot(raw, tz) for raw in raws])


def _local_timestamp(seconds: int, tz: ZoneInfo) -> str:
    return datetime.fromtimestamp(seconds, timezone.utc).astimezone(tz).strftime("%Y-%m-%d %H:%M %Z")


def _levels(person: dict) -> dict[str, str]:
    """Map each slot a person answered to 'preferred' or 'can_if_needed'.

    w2m stores availability as objects with a time and a level. Plain strings,
    as stock Crab Fit stores them, count as preferred.
    """
    levels = {}
    for entry in person["availability"]:
        if isinstance(entry, str):
            levels[entry] = "preferred"
        elif entry.get("level") in ("preferred", "can_if_needed"):
            levels[entry["time"]] = entry["level"]
    return levels


def _event_info(event: dict) -> EventInfo:
    tz = _zone(event["timezone"])
    return EventInfo(
        id=event["id"],
        name=event["name"],
        url=api.event_url(event["id"]),
        timezone=event["timezone"],
        created_at=_local_timestamp(event["created_at"], tz),
        kind="weekdays" if event["times"] and len(event["times"][0]) == 6 else "dates",
        times=describe_by_day(_slots(event)),
    )


@mcp.tool(title="Get a w2m event", annotations=READ_ONLY)
async def get_event(event: EventArg) -> EventInfo:
    """Look up a w2m poll: its name, timezone, link, and the days and times it offers."""
    return _event_info(await api.get_event(api.parse_event_id(event)))


@mcp.tool(title="List w2m respondents", annotations=READ_ONLY)
async def list_respondents(event: EventArg) -> Respondents:
    """List everyone who has responded to a w2m poll, with the times each person marked as
    available or 'if needed'. Times are in the event's timezone."""
    event_id = api.parse_event_id(event)
    data = await api.get_event(event_id)
    people = await api.get_people(event_id)
    tz = _zone(data["timezone"])
    slots = {s.raw: s for s in _slots(data)}
    respondents = []
    for person in people:
        levels = _levels(person)
        respondents.append(
            Respondent(
                name=person["name"],
                responded_at=_local_timestamp(person["created_at"], tz),
                available=describe_by_day([slots[t] for t, lv in levels.items() if lv == "preferred" and t in slots]),
                if_needed=describe_by_day([slots[t] for t, lv in levels.items() if lv == "can_if_needed" and t in slots]),
            )
        )
    return Respondents(
        event_id=event_id,
        event_name=data["name"],
        url=api.event_url(event_id),
        timezone=data["timezone"],
        count=len(respondents),
        respondents=respondents,
    )


def rank_times(slots: list[Slot], people: list[dict], limit: int, merge: bool) -> list[TimeOption]:
    """Rank times by how many people can make them.

    With merge on, back-to-back slots with exactly the same people become one
    window. Ties go to more 'available' (not 'if needed') answers, then longer
    windows, then earlier times.
    """
    names = [p["name"] for p in people]
    levels = {p["name"]: _levels(p) for p in people}
    windows: list[tuple[list[Slot], tuple[str, ...], tuple[str, ...]]] = []
    for slot in slots:
        preferred = tuple(n for n in names if levels[n].get(slot.raw) == "preferred")
        if_needed = tuple(n for n in names if levels[n].get(slot.raw) == "can_if_needed")
        last = windows[-1] if windows else None
        if merge and last and adjacent(last[0][-1], slot) and (last[1], last[2]) == (preferred, if_needed):
            last[0].append(slot)
        else:
            windows.append(([slot], preferred, if_needed))
    windows = [w for w in windows if w[1] or w[2]]
    windows.sort(key=lambda w: (-(len(w[1]) + len(w[2])), -len(w[1]), -len(w[0]), w[0][0].sort_key))
    return [
        TimeOption(
            when=describe_run(run),
            available_count=len(preferred) + len(if_needed),
            available=list(preferred),
            if_needed=list(if_needed),
            missing=[n for n in names if n not in preferred and n not in if_needed],
        )
        for run, preferred, if_needed in windows[:limit]
    ]


@mcp.tool(title="Find the best times", annotations=READ_ONLY)
async def best_times(
    event: EventArg,
    limit: Annotated[int, Field(ge=1, le=50, description="How many time options to return.")] = 5,
    merge_adjacent: Annotated[
        bool,
        Field(description="Combine back-to-back 30-minute slots that the same people can make into one window."),
    ] = True,
) -> BestTimes:
    """Find the times most respondents can make for a w2m poll. Returns the top options,
    best first, each with who marked it available, who can make it only if needed, and who
    is missing. Times are in the event's timezone."""
    event_id = api.parse_event_id(event)
    data = await api.get_event(event_id)
    people = await api.get_people(event_id)
    if not people:
        raise ToolError(f"No one has responded to {api.event_url(event_id)} yet.")
    return BestTimes(
        event_id=event_id,
        event_name=data["name"],
        url=api.event_url(event_id),
        timezone=data["timezone"],
        respondent_count=len(people),
        options=rank_times(_slots(data), people, limit, merge_adjacent),
    )


@mcp.tool(
    title="Create a w2m poll",
    annotations=ToolAnnotations(read_only_hint=False, destructive_hint=False, idempotent_hint=False, open_world_hint=True),
)
async def create_poll(
    timezone: Annotated[str, Field(description="IANA timezone the times are in, such as 'America/New_York'.")],
    start_hour: Annotated[int, Field(ge=0, le=23, description="First hour on offer each day, 0-23, in the event's timezone.")],
    end_hour: Annotated[
        int,
        Field(ge=1, le=24, description="Hour the day's range ends, 1-24 (exclusive). 17 means the last slot starts at 16:30."),
    ],
    dates: Annotated[
        list[date] | None, Field(description="Specific dates to poll, as YYYY-MM-DD. Give either dates or weekdays.")
    ] = None,
    weekdays: Annotated[
        list[Weekday] | None,
        Field(description="Days of the week to poll, for a recurring meeting. Give either dates or weekdays."),
    ] = None,
    name: Annotated[str | None, Field(description="Poll title. w2m picks a random name if left out.")] = None,
) -> PollCreated:
    """Create a new w2m scheduling poll and return its shareable link. The poll is public:
    anyone with the link can see it and add their availability. If start_hour is later than
    end_hour, each day's range wraps past midnight, as on the website."""
    if bool(dates) == bool(weekdays):
        raise ToolError("Give exactly one of dates or weekdays.")
    if start_hour == end_hour:
        raise ToolError("start_hour and end_hour must differ.")
    tz = _zone(timezone)
    if dates:
        times = build_times(sorted(set(dates)), False, start_hour, end_hour, tz)
    else:
        times = build_times(weekday_dates(list(dict.fromkeys(weekdays))), True, start_hour, end_hour, tz)
    created = await api.create_event(name, times, timezone)
    return PollCreated(
        id=created["id"],
        name=created["name"],
        url=api.event_url(created["id"]),
        timezone=created["timezone"],
        times=describe_by_day(_slots(created)),
    )


def main() -> None:
    mcp.run()
