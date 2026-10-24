"""Unit tests for timestamp parsing, normalization, and cutoff computation."""

import pytest
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from backend.domain.timestamps import (
    parse_iso_utc,
    to_iso_utc,
    to_london,
    to_iso_london,
    compute_decision_cutoff,
    settlement_period_to_start_time,
    settlement_period_to_close_time,
    compute_lead_hours,
    get_delivery_date,
    get_delivery_hour,
)

def test_parse_iso_utc_valid():
    dt = parse_iso_utc("2026-01-15T09:20:00Z")
    assert dt.year == 2026
    assert dt.month == 1
    assert dt.day == 15
    assert dt.hour == 9
    assert dt.minute == 20
    assert dt.tzinfo == timezone.utc

def test_parse_iso_utc_with_offset():
    # 10:20 with +01:00 offset is 09:20 UTC
    dt = parse_iso_utc("2026-07-15T10:20:00+01:00")
    assert dt.tzinfo == timezone.utc
    assert dt.hour == 9
    assert dt.minute == 20

def test_parse_iso_utc_rejects_naive_and_malformed():
    with pytest.raises(ValueError, match="Malformed"):
        parse_iso_utc("not-a-timestamp")
    with pytest.raises(ValueError, match="Invalid"):
        parse_iso_utc("")
    with pytest.raises(ValueError, match="Naive datetime rejected"):
        parse_iso_utc("2026-01-15T09:20:00")

def test_to_iso_utc():
    dt = datetime(2026, 1, 15, 9, 20, 0, tzinfo=timezone.utc)
    assert to_iso_utc(dt) == "2026-01-15T09:20:00Z"

def test_to_london_and_iso():
    # Winter (GMT / UTC+0)
    dt_winter = datetime(2026, 1, 15, 9, 20, 0, tzinfo=timezone.utc)
    assert to_iso_london(dt_winter) == "2026-01-15T09:20:00+00:00"
    
    # Summer (BST / UTC+1)
    dt_summer = datetime(2026, 7, 15, 8, 20, 0, tzinfo=timezone.utc)
    assert to_iso_london(dt_summer) == "2026-07-15T09:20:00+01:00"

def test_compute_decision_cutoff_winter():
    # Target delivery date: 2026-01-15
    # D-1 is 2026-01-14 at 09:20 Europe/London
    # January is GMT -> 2026-01-14T09:20:00Z
    cutoff = compute_decision_cutoff("2026-01-15", "09:20:00")
    assert cutoff.tzinfo == timezone.utc
    assert cutoff == datetime(2026, 1, 14, 9, 20, 0, tzinfo=timezone.utc)

def test_compute_decision_cutoff_dst_transition():
    # In summer (e.g. delivery on 2026-07-15), 09:20 BST is 08:20 UTC
    cutoff = compute_decision_cutoff("2026-07-15", "09:20:00")
    assert cutoff.tzinfo == timezone.utc
    assert cutoff == datetime(2026, 7, 14, 8, 20, 0, tzinfo=timezone.utc)

def test_settlement_period_mapping():
    # Period 1 is 00:00:00Z to 00:30:00Z
    assert settlement_period_to_start_time("2026-01-01", 1) == "2026-01-01T00:00:00Z"
    assert settlement_period_to_close_time("2026-01-01", 1) == datetime(2026, 1, 1, 0, 30, 0, tzinfo=timezone.utc)
    
    # Period 48 is 23:30:00Z to 24:00:00Z (next day 00:00)
    assert settlement_period_to_start_time("2026-01-01", 48) == "2026-01-01T23:30:00Z"
    assert settlement_period_to_close_time("2026-01-01", 48) == datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc)

def test_settlement_period_out_of_range():
    with pytest.raises(ValueError, match="between 1 and 50"):
        settlement_period_to_start_time("2026-01-01", 0)
    with pytest.raises(ValueError, match="between 1 and 50"):
        settlement_period_to_start_time("2026-01-01", 51)

def test_lead_hours_and_extractors():
    lead = compute_lead_hours("2026-01-14T09:20:00Z", "2026-01-15T12:00:00Z")
    assert round(lead, 2) == 26.67
    
    assert get_delivery_date("2026-01-15T14:00:00Z") == "2026-01-15"
    assert get_delivery_hour("2026-01-15T14:00:00Z") == 14
