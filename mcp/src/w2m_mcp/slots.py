"""Crab Fit time-slot strings and their conversion to local times.

The API stores every time in UTC as one of two string formats:

* ``HHmm-DDMMYYYY`` for polls over specific dates, such as ``1400-12102026``.
* ``HHmm-d`` for polls over days of the week, where ``d`` is 0 (Sunday) to 6.

An event lists whole hours. People answer in 30-minute slots, so each event
hour ``HH..`` expands to the slots ``HH00`` and ``HH30``, as the w2m frontend does.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

SLOT_MINUTES = 30
WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]


@dataclass(frozen=True)
class Slot:
    raw: str
    local: datetime
    weekly: bool

    @property
    def day_label(self) -> str:
        if self.weekly:
            return self.local.strftime("%A")
        return self.local.strftime("%a %d %b %Y")

    @property
    def sort_key(self) -> tuple:
        if self.weekly:
            # Monday first, then time of day.
            return ((self.local.weekday()), self.local.time())
        return (self.local,)


def expand_times(times: list[str]) -> list[str]:
    """Expand event hours into the 30-minute slots people answer in."""
    return [f"{t[:2]}{minute}{t[4:]}" for t in times for minute in ("00", "30")]


def is_weekly(raw: str) -> bool:
    return len(raw) == 6


def parse_slot(raw: str, tz: ZoneInfo, today: date | None = None) -> Slot:
    """Convert one UTC slot string into a Slot in the event's timezone."""
    hour, minute = int(raw[0:2]), int(raw[2:4])
    if len(raw) == 13:
        day, month, year = int(raw[5:7]), int(raw[7:9]), int(raw[9:13])
        utc = datetime(year, month, day, hour, minute, tzinfo=timezone.utc)
        return Slot(raw, utc.astimezone(tz), weekly=False)
    if len(raw) == 6:
        # Anchor weekday slots to the current week so the UTC offset matches
        # the one people see on the site today.
        today = today or datetime.now(timezone.utc).date()
        sunday = today - timedelta(days=today.isoweekday() % 7)
        utc_day = sunday + timedelta(days=int(raw[5]))
        utc = datetime.combine(utc_day, time(hour, minute), tzinfo=timezone.utc)
        return Slot(raw, utc.astimezone(tz), weekly=True)
    raise ValueError(f"Unrecognized time slot {raw!r}")


def sort_slots(slots: list[Slot]) -> list[Slot]:
    return sorted(slots, key=lambda s: s.sort_key)


def adjacent(a: Slot, b: Slot) -> bool:
    """True when slot b starts right where slot a ends, on the same day."""
    return a.day_label == b.day_label and b.local - a.local == timedelta(minutes=SLOT_MINUTES)


def group_runs(slots: list[Slot]) -> list[list[Slot]]:
    """Split sorted slots into runs of back-to-back slots on the same day."""
    runs: list[list[Slot]] = []
    for slot in slots:
        if runs and adjacent(runs[-1][-1], slot):
            runs[-1].append(slot)
        else:
            runs.append([slot])
    return runs


def describe_run(run: list[Slot]) -> str:
    """Label a run of slots, such as ``Mon 12 Oct 2026 09:00-11:30``."""
    end = run[-1].local + timedelta(minutes=SLOT_MINUTES)
    return f"{run[0].day_label} {run[0].local:%H:%M}-{end:%H:%M}"


def describe_by_day(slots: list[Slot]) -> list[str]:
    """Summarize slots as one ``day: ranges`` line per day."""
    days: dict[str, list[str]] = {}
    for run in group_runs(sort_slots(slots)):
        end = run[-1].local + timedelta(minutes=SLOT_MINUTES)
        days.setdefault(run[0].day_label, []).append(f"{run[0].local:%H:%M}-{end:%H:%M}")
    return [f"{day}: {', '.join(ranges)}" for day, ranges in days.items()]


def serialize(utc: datetime, weekly: bool) -> str:
    if weekly:
        return f"{utc:%H%M}-{utc.isoweekday() % 7}"
    return f"{utc:%H%M-%d%m%Y}"


def build_times(
    days: list[date], weekly: bool, start_hour: int, end_hour: int, tz: ZoneInfo
) -> list[str]:
    """Build event hours the way the w2m create form does.

    Hours run from start_hour up to but not including end_hour, in the event's
    timezone. When start_hour is after end_hour, the range wraps past midnight
    within each day, matching the site.
    """
    if start_hour > end_hour:
        hours = [*range(0, end_hour), *range(start_hour, 24)]
    else:
        hours = list(range(start_hour, end_hour))
    times = []
    for day in days:
        for hour in hours:
            local = datetime.combine(day, time(hour), tzinfo=tz)
            times.append(serialize(local.astimezone(timezone.utc), weekly))
    return times


def weekday_dates(weekdays: list[str], today: date | None = None) -> list[date]:
    """Pick a date in the current week for each weekday name, as the site does."""
    today = today or date.today()
    return [today + timedelta(days=WEEKDAYS.index(w) - today.isoweekday()) for w in weekdays]
