"""
Configuration for Power Monitoring Data Generator.

Defines standard rooms and generation parameters per data-model.md.
"""

from typing import List, Dict, Any


# Standard rooms per FR-002
STANDARD_ROOMS: List[Dict[str, Any]] = [
    {
        "room_name": "Parents room",
        "room_type": "parent",
        "circuit_capacity_watts": 1800,
        "circuit_capacity_amps": 15,
        "baseline_wattage_min": 100,
        "baseline_wattage_max": 500
    },
    {
        "room_name": "Sons room",
        "room_type": "children",
        "circuit_capacity_watts": 1800,
        "circuit_capacity_amps": 15,
        "baseline_wattage_min": 100,
        "baseline_wattage_max": 500
    },
    {
        "room_name": "Daughters room",
        "room_type": "children",
        "circuit_capacity_watts": 1800,
        "circuit_capacity_amps": 15,
        "baseline_wattage_min": 100,
        "baseline_wattage_max": 500
    },
    {
        "room_name": "Kitchen",
        "room_type": "common",
        "circuit_capacity_watts": 1800,
        "circuit_capacity_amps": 15,
        "baseline_wattage_min": 100,
        "baseline_wattage_max": 500
    },
    {
        "room_name": "Living room",
        "room_type": "common",
        "circuit_capacity_watts": 1800,
        "circuit_capacity_amps": 15,
        "baseline_wattage_min": 100,
        "baseline_wattage_max": 500
    }
]


# Data generation parameters
DATA_GENERATION_CONFIG = {
    # Time parameters
    "total_days": 14,
    "interval_minutes": 10,
    "readings_per_day": 144,  # 24 hours × 6 readings/hour
    "total_readings_per_room": 2016,  # 144 × 14
    
    # Baseline consumption
    "baseline_min_watts": 100,
    "baseline_max_watts": 500,
    
    # Weekday afternoon spike parameters (FR-004)
    "spike_start_hour": 15,  # 3:00 PM
    "spike_end_hour": 16,    # 4:00 PM (exclusive, so 3:00-3:59 PM)
    "spike_min_watts": 1800,
    "spike_max_watts": 2200,
    "spike_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    
    # Electrical parameters
    "voltage": 120,  # US residential standard
    "breaker_threshold_amps": 15,
    "breaker_threshold_watts": 1800,  # 15A × 120V
    
    # Timezone
    "timezone_offset": "-05:00",  # EST (use "-04:00" for EDT)
}


def get_room_configs() -> List[Dict[str, Any]]:
    """
    Get list of room configurations.
    
    Returns:
        List of room configuration dictionaries
    """
    return STANDARD_ROOMS.copy()


def is_weekday_afternoon_spike_time(dt, room_type: str) -> bool:
    """
    Determine if a datetime falls within weekday afternoon spike window.
    
    Args:
        dt: datetime object to check
        room_type: Type of room (children, parent, common)
        
    Returns:
        True if children's room during weekday 3-4pm, False otherwise
    """
    # Only children's rooms have spikes
    if room_type != "children":
        return False
    
    # Check if weekday (Monday=0, Sunday=6)
    if dt.strftime("%A") not in DATA_GENERATION_CONFIG["spike_days"]:
        return False
    
    # Check if within spike time window (3:00-3:59 PM)
    hour = dt.hour
    return (DATA_GENERATION_CONFIG["spike_start_hour"] <= hour < 
            DATA_GENERATION_CONFIG["spike_end_hour"])
