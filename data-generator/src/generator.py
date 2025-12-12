"""
Power Monitoring Data Generator

Generates realistic 14-day time-series CSV data showing weekday afternoon
power spikes in children's rooms that cause circuit breaker trips.
"""

import argparse
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pathlib import Path

from models import Room, PowerReading, BreakerEvent
from config import (
    STANDARD_ROOMS, 
    DATA_GENERATION_CONFIG, 
    get_room_configs,
    is_weekday_afternoon_spike_time
)
from csv_writer import CSVWriter


def generate_time_intervals(start_date: datetime, days: int, interval_minutes: int) -> List[datetime]:
    """
    Generate time intervals for power readings.
    
    Creates timestamps at regular intervals over the specified number of days.
    Per FR-001: 10-minute intervals over 14 days = 2,016 readings per room.
    
    Args:
        start_date: Starting datetime for the series
        days: Number of days to generate (default 14)
        interval_minutes: Minutes between readings (default 10)
        
    Returns:
        List of datetime objects at regular intervals
        
    Example:
        >>> intervals = generate_time_intervals(datetime(2025, 12, 1), 1, 10)
        >>> len(intervals)
        144  # 24 hours × 6 readings/hour
    """
    intervals = []
    current_time = start_date
    total_intervals = (days * 24 * 60) // interval_minutes
    
    for _ in range(total_intervals):
        intervals.append(current_time)
        current_time += timedelta(minutes=interval_minutes)
    
    return intervals


def generate_baseline_power(room_type: str, timestamp: datetime) -> float:
    """
    Generate baseline power consumption with normal variations.
    
    Per FR-003: Normal usage is 100-500 watts with realistic fluctuations.
    Adds slight time-of-day variation for realism.
    
    Args:
        room_type: Type of room (children, parent, common)
        timestamp: Current timestamp for time-based variation
        
    Returns:
        Baseline power consumption in watts (100-500W range)
    """
    # Base range per config
    min_watts = DATA_GENERATION_CONFIG["baseline_min_watts"]
    max_watts = DATA_GENERATION_CONFIG["baseline_max_watts"]
    
    # Random baseline within range
    baseline = random.uniform(min_watts, max_watts)
    
    # Add slight time-of-day variation for realism
    hour = timestamp.hour
    
    # Slightly higher consumption during evening hours (6pm-10pm)
    if 18 <= hour <= 22:
        baseline *= random.uniform(1.1, 1.3)
    # Lower during late night/early morning (midnight-6am)
    elif 0 <= hour <= 6:
        baseline *= random.uniform(0.6, 0.8)
    
    # Ensure we don't exceed normal baseline maximum
    baseline = min(baseline, max_watts)
    
    return round(baseline, 2)


def generate_spike_power() -> float:
    """
    Generate power consumption during weekday afternoon spike.
    
    Per FR-004: Children's rooms experience 1800-2200W spikes during
    weekday afternoons (3-4pm) when gaming consoles and TVs are used.
    This exceeds the 1800W circuit capacity, causing breaker trips.
    
    Returns:
        Spike power consumption in watts (1800-2200W range)
    """
    min_spike = DATA_GENERATION_CONFIG["spike_min_watts"]
    max_spike = DATA_GENERATION_CONFIG["spike_max_watts"]
    
    return round(random.uniform(min_spike, max_spike), 2)


def generate_power_reading(room: Room, timestamp: datetime) -> PowerReading:
    """
    Generate a single power reading for a room at a specific time.
    
    Determines whether to use baseline or spike power based on room type,
    day of week, and time of day per FR-004 and FR-005.
    
    Args:
        room: Room entity with configuration
        timestamp: When the reading occurs
        
    Returns:
        PowerReading entity with calculated amperage and breaker status
    """
    # Check if this is spike time for this room
    if is_weekday_afternoon_spike_time(timestamp, room.room_type):
        wattage = generate_spike_power()
    else:
        wattage = generate_baseline_power(room.room_type, timestamp)
    
    # Create PowerReading (will auto-calculate amperage and breaker_tripped)
    reading = PowerReading(
        timestamp=timestamp,
        room_name=room.room_name,
        wattage=wattage,
        amperage=0,  # Will be calculated by __post_init__
        voltage=DATA_GENERATION_CONFIG["voltage"]
    )
    
    return reading


def generate_room_data(room: Room, time_intervals: List[datetime]) -> List[PowerReading]:
    """
    Generate complete time-series data for a single room.
    
    Creates one PowerReading for each time interval over the full period.
    
    Args:
        room: Room entity to generate data for
        time_intervals: List of timestamps for readings
        
    Returns:
        List of PowerReading entities (2,016 for 14 days)
    """
    readings = []
    
    for timestamp in time_intervals:
        reading = generate_power_reading(room, timestamp)
        readings.append(reading)
    
    return readings


def generate_all_data(rooms: List[Room], time_intervals: List[datetime]) -> List[Dict[str, Any]]:
    """
    Generate power data for all rooms over the time period.
    
    Creates complete dataset sorted by timestamp then room name for
    efficient chart rendering and time-range filtering.
    
    Args:
        rooms: List of Room entities
        time_intervals: List of timestamps
        
    Returns:
        List of CSV row dictionaries sorted by timestamp
    """
    all_readings = []
    
    # Generate data for each room
    for room in rooms:
        room_readings = generate_room_data(room, time_intervals)
        all_readings.extend(room_readings)
    
    # Convert to CSV rows
    csv_rows = [reading.to_csv_row() for reading in all_readings]
    
    # Sort by timestamp for efficient processing
    # Secondary sort by room_name for consistent ordering
    csv_rows.sort(key=lambda x: (x['timestamp'], x['room_name']))
    
    return csv_rows


def count_breaker_trips(csv_rows: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Count breaker trips per room for summary statistics.
    
    Args:
        csv_rows: List of CSV row dictionaries
        
    Returns:
        Dictionary mapping room names to trip counts
    """
    trip_counts = {}
    
    for row in csv_rows:
        room = row['room_name']
        if room not in trip_counts:
            trip_counts[room] = 0
        
        if row['breaker_tripped'] == 'true':
            trip_counts[room] += 1
    
    return trip_counts


def print_summary(csv_rows: List[Dict[str, Any]], filepath: str, file_size_kb: float):
    """
    Print generation summary statistics.
    
    Args:
        csv_rows: Generated CSV data
        filepath: Output file path
        file_size_kb: File size in kilobytes
    """
    # Count records per room
    room_counts = {}
    for row in csv_rows:
        room = row['room_name']
        room_counts[room] = room_counts.get(room, 0) + 1
    
    # Count breaker trips
    trip_counts = count_breaker_trips(csv_rows)
    
    print("\nData generation complete!\n")
    print("Room Statistics:")
    print("-" * 60)
    
    for room_name in sorted(room_counts.keys()):
        record_count = room_counts[room_name]
        trip_count = trip_counts.get(room_name, 0)
        
        if trip_count > 0:
            print(f"  * {room_name}: {record_count:,} records ({trip_count} breaker trips)")
        else:
            print(f"  * {room_name}: {record_count:,} records")
    
    print("-" * 60)
    print(f"\nTotal: {len(csv_rows):,} records written to {filepath}")
    print(f"File size: {file_size_kb:.2f} KB")
    print("\nExpected pattern: Weekday 3-4pm spikes in children's rooms only")


def main():
    """
    Main entry point for data generator CLI.
    
    Parses command-line arguments, generates data, and writes CSV file.
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Generate realistic power monitoring test data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generator.py
  python generator.py --output power-data.csv
  python generator.py --output C:\\data\\test-data.csv
  
Output:
  CSV file with columns: timestamp, room_name, wattage, amperage, voltage, breaker_tripped
  Format: RFC 4180 compliant, UTF-8 encoded
  
Data Characteristics:
  - 14 days of data per room
  - 10-minute intervals (144 readings/day)
  - 2,016 total readings per room
  - 5 rooms = 10,080 total records
  - Weekday 3-4pm spikes in children's rooms (1800-2200W)
  - Breaker trips when amperage > 15A
        """
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='output.csv',
        help='Output CSV file path (default: output.csv)'
    )
    
    parser.add_argument(
        '--start-date',
        type=str,
        default=None,
        help='Start date for data generation (ISO format: YYYY-MM-DD). Default: 14 days ago from today'
    )
    
    args = parser.parse_args()
    
    # Determine start date
    if args.start_date:
        try:
            start_date = datetime.fromisoformat(args.start_date)
        except ValueError:
            print(f"Error: Invalid date format '{args.start_date}'. Use YYYY-MM-DD")
            return 1
    else:
        # Default to 14 days ago so end date is roughly today
        start_date = datetime.now() - timedelta(days=DATA_GENERATION_CONFIG["total_days"])
    
    # Set to midnight for clean start time
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"\nPower Monitoring Data Generator")
    print(f"-" * 60)
    print(f"Generating {DATA_GENERATION_CONFIG['total_days']} days of power data...")
    print(f"Start date: {start_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Interval: {DATA_GENERATION_CONFIG['interval_minutes']} minutes")
    print(f"Rooms: {len(STANDARD_ROOMS)}")
    print(f"-" * 60)
    
    # Create Room entities
    rooms = [Room(**room_config) for room_config in get_room_configs()]
    
    # Generate time intervals
    time_intervals = generate_time_intervals(
        start_date,
        DATA_GENERATION_CONFIG["total_days"],
        DATA_GENERATION_CONFIG["interval_minutes"]
    )
    
    print(f"\nGenerating {len(time_intervals)} readings per room...")
    
    # Generate all data
    csv_rows = generate_all_data(rooms, time_intervals)
    
    # Write to CSV
    print(f"Writing data to {args.output}...")
    writer = CSVWriter(args.output)
    writer.write(csv_rows)
    
    # Print summary
    print_summary(csv_rows, args.output, writer.get_file_size_kb())
    
    return 0


if __name__ == '__main__':
    exit(main())
