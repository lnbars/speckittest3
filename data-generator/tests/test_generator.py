"""
Unit tests for power data generator.

Tests time interval generation, baseline power, and spike detection logic.
"""

import pytest
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from generator import (
    generate_time_intervals,
    generate_baseline_power,
    generate_spike_power,
    generate_power_reading,
    generate_room_data,
    count_breaker_trips
)
from models import Room
from config import DATA_GENERATION_CONFIG


class TestTimeIntervalGeneration:
    """Test time interval generation (T024)."""
    
    def test_intervals_count_one_day(self):
        """Verify correct number of intervals for one day."""
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=1, interval_minutes=10)
        
        # 24 hours × 6 readings per hour = 144 readings per day
        assert len(intervals) == 144
    
    def test_intervals_count_fourteen_days(self):
        """Verify correct number of intervals for 14 days (FR-001)."""
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=14, interval_minutes=10)
        
        # 144 readings/day × 14 days = 2,016 readings
        assert len(intervals) == 2016
    
    def test_intervals_spacing(self):
        """Verify intervals are exactly 10 minutes apart."""
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=1, interval_minutes=10)
        
        for i in range(len(intervals) - 1):
            diff = intervals[i + 1] - intervals[i]
            assert diff == timedelta(minutes=10)
    
    def test_intervals_start_time(self):
        """Verify first interval matches start time."""
        start = datetime(2025, 12, 1, 15, 30, 0)
        intervals = generate_time_intervals(start, days=1, interval_minutes=10)
        
        assert intervals[0] == start
    
    def test_intervals_chronological_order(self):
        """Verify intervals are in chronological order."""
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=2, interval_minutes=10)
        
        for i in range(len(intervals) - 1):
            assert intervals[i] < intervals[i + 1]


class TestBaselinePowerGeneration:
    """Test baseline power consumption generation (T025)."""
    
    def test_baseline_within_range(self):
        """Verify baseline power is within 100-500W range."""
        timestamp = datetime(2025, 12, 1, 12, 0, 0)  # Noon
        
        for _ in range(100):  # Test multiple times for randomness
            power = generate_baseline_power("common", timestamp)
            assert 100 <= power <= 500
    
    def test_baseline_varies_by_time(self):
        """Verify baseline has time-of-day variation."""
        # Evening hours should have higher consumption
        evening = datetime(2025, 12, 1, 20, 0, 0)
        
        # Early morning should have lower consumption  
        morning = datetime(2025, 12, 1, 3, 0, 0)
        
        evening_values = [generate_baseline_power("common", evening) for _ in range(50)]
        morning_values = [generate_baseline_power("common", morning) for _ in range(50)]
        
        # Average evening should be higher than average morning
        assert sum(evening_values) / len(evening_values) > sum(morning_values) / len(morning_values)
    
    def test_baseline_different_room_types(self):
        """Verify baseline generation works for all room types."""
        timestamp = datetime(2025, 12, 1, 12, 0, 0)
        
        for room_type in ["children", "parent", "common"]:
            power = generate_baseline_power(room_type, timestamp)
            assert 100 <= power <= 500


class TestSpikePowerGeneration:
    """Test spike power generation for weekday afternoons (T026)."""
    
    def test_spike_within_range(self):
        """Verify spike power is within 1800-2200W range (FR-004)."""
        for _ in range(100):
            power = generate_spike_power()
            assert 1800 <= power <= 2200
    
    def test_spike_exceeds_breaker_threshold(self):
        """Verify spikes exceed 1800W threshold to trip breakers."""
        for _ in range(100):
            power = generate_spike_power()
            assert power >= DATA_GENERATION_CONFIG["breaker_threshold_watts"]


class TestWeekdayAfternoonSpikes:
    """Test weekday afternoon spike detection (T026)."""
    
    def test_children_room_weekday_afternoon_spike(self):
        """Verify children's rooms have spikes on weekday afternoons."""
        # Create children's room
        room = Room(room_name="Sons room", room_type="children")
        
        # Wednesday 3:30 PM (weekday afternoon)
        weekday_afternoon = datetime(2025, 12, 3, 15, 30, 0)  # Wednesday
        
        reading = generate_power_reading(room, weekday_afternoon)
        
        # Should have spike power (>= 1800W)
        assert reading.wattage >= 1800
        assert reading.breaker_tripped is True
    
    def test_children_room_weekend_no_spike(self):
        """Verify children's rooms have no spikes on weekends (FR-005)."""
        room = Room(room_name="Sons room", room_type="children")
        
        # Saturday 3:30 PM (weekend afternoon)
        weekend_afternoon = datetime(2025, 12, 6, 15, 30, 0)  # Saturday
        
        reading = generate_power_reading(room, weekend_afternoon)
        
        # Should have baseline power (< 1800W)
        assert reading.wattage < 1800
        assert reading.breaker_tripped is False
    
    def test_parent_room_no_spikes(self):
        """Verify parent rooms never have spikes."""
        room = Room(room_name="Parents room", room_type="parent")
        
        # Weekday afternoon - but parent room shouldn't spike
        weekday_afternoon = datetime(2025, 12, 3, 15, 30, 0)
        
        reading = generate_power_reading(room, weekday_afternoon)
        
        assert reading.wattage < 1800
        assert reading.breaker_tripped is False
    
    def test_weekday_morning_no_spike(self):
        """Verify no spikes outside 3-4pm window."""
        room = Room(room_name="Sons room", room_type="children")
        
        # Weekday morning (not 3-4pm)
        weekday_morning = datetime(2025, 12, 3, 10, 0, 0)
        
        reading = generate_power_reading(room, weekday_morning)
        
        assert reading.wattage < 1800
        assert reading.breaker_tripped is False


class TestDataGeneration:
    """Test complete data generation workflow."""
    
    def test_generate_room_data_count(self):
        """Verify correct number of readings generated per room."""
        room = Room(room_name="Kitchen", room_type="common")
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=14, interval_minutes=10)
        
        readings = generate_room_data(room, intervals)
        
        assert len(readings) == 2016  # 144 × 14
    
    def test_all_readings_have_room_name(self):
        """Verify all readings are tagged with correct room name."""
        room = Room(room_name="Living room", room_type="common")
        start = datetime(2025, 12, 1, 0, 0, 0)
        intervals = generate_time_intervals(start, days=1, interval_minutes=10)
        
        readings = generate_room_data(room, intervals)
        
        for reading in readings:
            assert reading.room_name == "Living room"
    
    def test_breaker_trip_counting(self):
        """Verify breaker trip counting logic."""
        csv_rows = [
            {'room_name': 'Sons room', 'breaker_tripped': 'true'},
            {'room_name': 'Sons room', 'breaker_tripped': 'false'},
            {'room_name': 'Sons room', 'breaker_tripped': 'true'},
            {'room_name': 'Kitchen', 'breaker_tripped': 'false'},
        ]
        
        counts = count_breaker_trips(csv_rows)
        
        assert counts['Sons room'] == 2
        assert counts.get('Kitchen', 0) == 0
