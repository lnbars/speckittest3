"""
Integration tests for complete data generation workflow.

Tests end-to-end generation of 14-day dataset (T028).
"""

import pytest
import tempfile
import csv
from pathlib import Path
from datetime import datetime
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from generator import generate_time_intervals, generate_all_data, main
from models import Room
from config import STANDARD_ROOMS, DATA_GENERATION_CONFIG, get_room_configs
from csv_writer import CSVWriter


class TestIntegration:
    """Integration tests for complete data generation (T028)."""
    
    def test_full_14_day_generation(self):
        """
        Verify complete 14-day dataset generation produces correct record count.
        
        Per FR-001: 2,016 records per room × 5 rooms = 10,080 total records
        """
        # Setup
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        
        # Generate time intervals
        intervals = generate_time_intervals(
            start_date,
            DATA_GENERATION_CONFIG["total_days"],
            DATA_GENERATION_CONFIG["interval_minutes"]
        )
        
        # Verify interval count per room
        assert len(intervals) == 2016  # 144/day × 14 days
        
        # Generate all data
        csv_rows = generate_all_data(rooms, intervals)
        
        # Verify total record count
        assert len(csv_rows) == 10080  # 2,016 × 5 rooms
    
    def test_all_rooms_present(self):
        """Verify all 5 standard rooms have data."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        
        csv_rows = generate_all_data(rooms, intervals)
        
        # Extract unique room names
        room_names = set(row['room_name'] for row in csv_rows)
        
        expected_rooms = {
            'Parents room',
            'Sons room',
            'Daughters room',
            'Kitchen',
            'Living room'
        }
        
        assert room_names == expected_rooms
    
    def test_each_room_has_2016_records(self):
        """Verify each room has exactly 2,016 records (FR-001)."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        
        csv_rows = generate_all_data(rooms, intervals)
        
        # Count records per room
        room_counts = {}
        for row in csv_rows:
            room = row['room_name']
            room_counts[room] = room_counts.get(room, 0) + 1
        
        # Verify each room has 2,016 records
        for room_name, count in room_counts.items():
            assert count == 2016, f"{room_name} has {count} records, expected 2016"
    
    def test_weekday_afternoon_spikes_present(self):
        """
        Verify weekday afternoon spikes exist in children's rooms.
        
        Per FR-004: Sons room and Daughters room should have spikes
        during 3-4pm on weekdays that exceed 1800W.
        """
        start_date = datetime(2025, 12, 1, 0, 0, 0)  # This is a Sunday
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        
        csv_rows = generate_all_data(rooms, intervals)
        
        # Find spike records in children's rooms
        sons_spikes = [
            row for row in csv_rows
            if row['room_name'] == 'Sons room' and float(row['wattage']) >= 1800
        ]
        
        daughters_spikes = [
            row for row in csv_rows
            if row['room_name'] == 'Daughters room' and float(row['wattage']) >= 1800
        ]
        
        # Should have multiple spikes (roughly 6 readings/hour × 1 hour × 10 weekdays = ~60)
        assert len(sons_spikes) > 40, f"Sons room only has {len(sons_spikes)} spikes"
        assert len(daughters_spikes) > 40, f"Daughters room only has {len(daughters_spikes)} spikes"
    
    def test_parent_rooms_no_spikes(self):
        """Verify parent and common rooms never exceed circuit capacity."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        
        csv_rows = generate_all_data(rooms, intervals)
        
        # Check non-children rooms
        for row in csv_rows:
            if row['room_name'] in ('Parents room', 'Kitchen', 'Living room'):
                wattage = float(row['wattage'])
                assert wattage < 1800, f"{row['room_name']} has spike: {wattage}W"
    
    def test_csv_file_generation(self):
        """Test complete CSV file generation end-to-end."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / "test_output.csv"
            
            # Generate data
            start_date = datetime(2025, 12, 1, 0, 0, 0)
            rooms = [Room(**config) for config in get_room_configs()]
            intervals = generate_time_intervals(start_date, 14, 10)
            csv_rows = generate_all_data(rooms, intervals)
            
            # Write to file
            writer = CSVWriter(str(filepath))
            writer.write(csv_rows)
            
            # Verify file exists and has content
            assert filepath.exists()
            assert filepath.stat().st_size > 0
            
            # Read and verify
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows_read = list(reader)
                
                assert len(rows_read) == 10080
    
    def test_timestamps_chronologically_ordered(self):
        """Verify timestamps are in chronological order."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        csv_rows = generate_all_data(rooms, intervals)
        
        # Check that timestamps are sorted
        timestamps = [row['timestamp'] for row in csv_rows]
        
        for i in range(len(timestamps) - 1):
            # Current timestamp should be <= next timestamp
            assert timestamps[i] <= timestamps[i + 1]
    
    def test_breaker_trips_only_in_children_rooms(self):
        """Verify breaker trips only occur in children's rooms during spikes."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 14, 10)
        csv_rows = generate_all_data(rooms, intervals)
        
        # Find all breaker trips
        trips = [row for row in csv_rows if row['breaker_tripped'] == 'true']
        
        # All trips should be in children's rooms
        for trip in trips:
            assert trip['room_name'] in ('Sons room', 'Daughters room')
    
    def test_mathematical_consistency(self):
        """Verify amperage = wattage / voltage for all records."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 1, 10)  # Just 1 day for speed
        csv_rows = generate_all_data(rooms, intervals)
        
        for row in csv_rows:
            wattage = float(row['wattage'])
            amperage = float(row['amperage'])
            voltage = int(row['voltage'])
            
            expected_amperage = wattage / voltage
            
            # Allow 0.01 tolerance for floating point
            assert abs(amperage - expected_amperage) < 0.01
    
    def test_breaker_tripped_logic(self):
        """Verify breaker_tripped flag is set when amperage > 15."""
        start_date = datetime(2025, 12, 1, 0, 0, 0)
        rooms = [Room(**config) for config in get_room_configs()]
        intervals = generate_time_intervals(start_date, 1, 10)
        csv_rows = generate_all_data(rooms, intervals)
        
        for row in csv_rows:
            amperage = float(row['amperage'])
            breaker_tripped = row['breaker_tripped'] == 'true'
            
            if amperage > 15.0:
                assert breaker_tripped, f"Breaker should trip at {amperage}A"
            else:
                assert not breaker_tripped, f"Breaker should not trip at {amperage}A"
