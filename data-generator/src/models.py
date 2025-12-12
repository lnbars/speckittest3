"""
Data models for Power Monitoring Analysis Tool.

Contains entity definitions for Room, PowerReading, and BreakerEvent
per data-model.md specification.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import uuid


@dataclass
class Room:
    """
    Represents a physical location in the house with its own electrical circuit.
    
    Attributes:
        room_name: Unique identifier for the room
        circuit_capacity_watts: Maximum wattage before breaker trips (1800W for 15A circuit)
        circuit_capacity_amps: Maximum amperage (15A for standard residential)
        baseline_wattage_min: Lower bound of normal consumption (default 100W)
        baseline_wattage_max: Upper bound of normal consumption (default 500W)
        room_type: Category for pattern generation (children, parent, common)
    """
    room_name: str
    circuit_capacity_watts: int = 1800  # 15A × 120V
    circuit_capacity_amps: int = 15
    baseline_wattage_min: int = 100
    baseline_wattage_max: int = 500
    room_type: str = "common"  # children, parent, common
    
    def __post_init__(self):
        """Validate room configuration."""
        if not self.room_name or len(self.room_name) > 50:
            raise ValueError("room_name must be non-empty and max 50 characters")
        
        if self.room_type not in ("children", "parent", "common"):
            raise ValueError("room_type must be 'children', 'parent', or 'common'")
        
        if self.circuit_capacity_watts != 1800:
            raise ValueError("circuit_capacity_watts must be 1800 (15A × 120V)")
        
        if self.circuit_capacity_amps != 15:
            raise ValueError("circuit_capacity_amps must be 15")


@dataclass
class PowerReading:
    """
    Represents a single measurement of electrical consumption at a specific point in time.
    
    Attributes:
        timestamp: ISO 8601 datetime when reading was taken
        room_name: Name of the room where measurement occurred
        wattage: Power consumption in watts
        amperage: Current in amperes (calculated as wattage/voltage)
        voltage: Circuit voltage (constant 120V for US residential)
        breaker_tripped: Flag indicating circuit breaker tripped (amperage > 15A)
    """
    timestamp: datetime
    room_name: str
    wattage: float
    amperage: float
    voltage: int = 120
    breaker_tripped: bool = False
    
    def __post_init__(self):
        """Calculate derived fields and validate."""
        # Calculate amperage if not provided or recalculate for consistency
        self.amperage = self.wattage / self.voltage
        
        # Determine breaker trip status
        self.breaker_tripped = self.amperage > 15.0
        
        # Validate per FR-022 minimal validation
        errors = self.validate()
        if errors:
            raise ValueError(f"Validation errors: {', '.join(errors)}")
    
    def validate(self) -> List[str]:
        """
        Minimal validation per FR-022.
        
        Returns:
            List of error messages (empty list if valid)
        """
        errors = []
        
        # Reject negative wattage
        if self.wattage < 0:
            errors.append("Wattage cannot be negative")
        
        # Reject null/missing required fields
        if self.timestamp is None:
            errors.append("Missing required field: timestamp")
        
        if not self.room_name:
            errors.append("Missing required field: room_name")
        
        if self.wattage is None:
            errors.append("Missing required field: wattage")
        
        if self.amperage is None:
            errors.append("Missing required field: amperage")
        
        if self.voltage is None:
            errors.append("Missing required field: voltage")
        
        # Validate voltage is 120
        if self.voltage != 120:
            errors.append("Voltage must be 120V for US residential circuits")
        
        # Validate amperage >= 0
        if self.amperage < 0:
            errors.append("Amperage cannot be negative")
        
        return errors
    
    def to_csv_row(self) -> dict:
        """
        Convert to CSV row format per contracts/csv-schema.md.
        
        Returns:
            Dictionary with CSV column names as keys
        """
        return {
            "timestamp": self.timestamp.isoformat(),
            "room_name": self.room_name,
            "wattage": round(self.wattage, 2),
            "amperage": round(self.amperage, 2),
            "voltage": self.voltage,
            "breaker_tripped": str(self.breaker_tripped).lower()
        }


@dataclass
class BreakerEvent:
    """
    Represents an instance when electrical load exceeds circuit capacity.
    
    Attributes:
        event_id: Unique identifier for the event (UUID)
        timestamp: When the overload occurred
        room_name: Room where overload occurred
        peak_wattage: Maximum wattage during event
        peak_amperage: Maximum amperage during event
        duration_minutes: How long overload lasted
        day_of_week: Day when event occurred (Mon-Sun)
        time_of_day: Time when event started (HH:MM format)
    """
    event_id: str
    timestamp: datetime
    room_name: str
    peak_wattage: float
    peak_amperage: float
    duration_minutes: int = 10
    day_of_week: str = ""
    time_of_day: str = ""
    
    def __post_init__(self):
        """Calculate derived fields."""
        if not self.event_id:
            self.event_id = str(uuid.uuid4())
        
        if not self.day_of_week:
            self.day_of_week = self.timestamp.strftime("%A")
        
        if not self.time_of_day:
            self.time_of_day = self.timestamp.strftime("%H:%M")
        
        # Validate overload occurred
        if self.peak_wattage <= 1800:
            raise ValueError("peak_wattage must exceed 1800W to be a breaker event")
        
        if self.peak_amperage <= 15:
            raise ValueError("peak_amperage must exceed 15A to be a breaker event")
    
    @classmethod
    def from_power_reading(cls, reading: PowerReading) -> Optional['BreakerEvent']:
        """
        Create BreakerEvent from PowerReading if overload detected.
        
        Args:
            reading: PowerReading to check for overload
            
        Returns:
            BreakerEvent if breaker tripped, None otherwise
        """
        if not reading.breaker_tripped:
            return None
        
        return cls(
            event_id=str(uuid.uuid4()),
            timestamp=reading.timestamp,
            room_name=reading.room_name,
            peak_wattage=reading.wattage,
            peak_amperage=reading.amperage,
            duration_minutes=10,  # Single reading interval
            day_of_week=reading.timestamp.strftime("%A"),
            time_of_day=reading.timestamp.strftime("%H:%M")
        )
