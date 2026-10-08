from datetime import date
from zoneinfo import ZoneInfo

from w2m_mcp.slots import build_times, describe_by_day, expand_times, parse_slot, weekday_dates


def test_expand_times_into_half_hours():
    assert expand_times(["1300-12102026", "0900-1"]) == ["1300-12102026", "1330-12102026", "0900-1", "0930-1"]


def test_parse_specific_date_slot():
    slot = parse_slot("0330-13102026", ZoneInfo("America/Los_Angeles"))
    assert not slot.weekly
    assert slot.local.isoformat() == "2026-10-12T20:30:00-07:00"
    assert slot.day_label == "Mon 12 Oct 2026"


def test_parse_weekday_slot_crossing_midnight():
    # 02:00 Monday UTC is 22:00 Sunday in New York.
    slot = parse_slot("0200-1", ZoneInfo("America/New_York"), today=date(2026, 10, 7))
    assert slot.weekly
    assert slot.day_label == "Sunday"
    assert slot.local.strftime("%H:%M") == "22:00"


def test_build_times_wraps_past_midnight():
    times = build_times([date(2026, 10, 12)], False, 22, 2, ZoneInfo("UTC"))
    assert times == ["0000-12102026", "0100-12102026", "2200-12102026", "2300-12102026"]


def test_build_times_full_day_end():
    times = build_times([date(2026, 10, 12)], False, 23, 24, ZoneInfo("UTC"))
    assert times == ["2300-12102026"]


def test_weekday_dates_in_current_week():
    # 7 Oct 2026 is a Wednesday. The site maps Sunday to the Sunday before Monday.
    assert weekday_dates(["monday", "sunday"], today=date(2026, 10, 7)) == [date(2026, 10, 5), date(2026, 10, 4)]


def test_describe_by_day_splits_gaps():
    tz = ZoneInfo("UTC")
    slots = [parse_slot(t, tz) for t in ["0900-12102026", "0930-12102026", "1100-12102026"]]
    assert describe_by_day(slots) == ["Mon 12 Oct 2026: 09:00-10:00, 11:00-11:30"]
