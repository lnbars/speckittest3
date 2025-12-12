# Data Model: Power Monitoring Analysis Tool

**Date**: 2025-12-12  
**Purpose**: Define entities, relationships, and validation rules for power monitoring data

---

## Core Entities

### 1. PowerReading

Represents a single measurement of electrical consumption at a specific point in time for a specific room.

**Fields**:

| Field | Type | Description | Validation | Example |
|-------|------|-------------|------------|---------|
| `timestamp` | ISO 8601 DateTime String | Moment when reading was taken | Required, valid ISO 8601 format, timezone-aware or documented as local time | `"2025-12-12T15:30:00-05:00"` |
| `room_name` | String | Name of the room where measurement occurred | Required, non-empty, max 50 chars | `"Sons room"` |
| `wattage` | Float | Power consumption in watts | Required, >= 0 (per FR-022 minimal validation) | `1850.5` |
| `amperage` | Float | Current in amperes (calculated as wattage/voltage) | Required, >= 0, typically <= 20A | `15.42` |
| `voltage` | Integer | Circuit voltage (constant for US residential) | Required, must be 120 | `120` |
| `breaker_tripped` | Boolean | Flag indicating circuit breaker tripped (when amperage > 15) | Required | `true` |

**Calculated Fields**:
- `amperage` = `wattage` / `voltage`
- `breaker_tripped` = `amperage` > 15.0

**Data Generation Rules** (FR-004, FR-005):
- **Baseline consumption**: 100-500 watts for normal usage
- **Weekday afternoon spikes (3-4pm, Mon-Fri)**: 1800-2200 watts in children's rooms only
- **Weekend afternoons**: No spikes (baseline only)
- **Time interval**: Exactly 10 minutes between consecutive readings

**Validation Rules** (FR-022 minimal validation):
```python
def validate_power_reading(reading):
    """Minimal validation per requirements."""
    errors = []
    
    # Reject negative wattage
    if reading.wattage < 0:
        errors.append("Wattage cannot be negative")
    
    # Reject null/missing required fields
    required_fields = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped']
    for field in required_fields:
        if field not in reading or reading[field] is None:
            errors.append(f"Missing required field: {field}")
    
    return errors  # Empty list = valid
```

**Example**:
```json
{
  "timestamp": "2025-12-01T15:30:00-05:00",
  "room_name": "Sons room",
  "wattage": 1850.5,
  "amperage": 15.42,
  "voltage": 120,
  "breaker_tripped": true
}
```

---

### 2. Room

Represents a physical location in the house with its own electrical circuit.

**Fields**:

| Field | Type | Description | Validation | Example |
|-------|------|-------------|------------|---------|
| `room_name` | String | Unique identifier for the room | Required, unique across dataset, max 50 chars | `"Living room"` |
| `circuit_capacity_watts` | Integer | Maximum wattage before breaker trips | Required, must be 1800 (15A × 120V) | `1800` |
| `circuit_capacity_amps` | Integer | Maximum amperage | Required, must be 15 | `15` |
| `baseline_wattage_min` | Integer | Lower bound of normal consumption | Optional, default 100 | `100` |
| `baseline_wattage_max` | Integer | Upper bound of normal consumption | Optional, default 500 | `500` |
| `room_type` | String (Enum) | Category of room for pattern generation | Required, one of: `children`, `parent`, `common` | `"children"` |

**Room Types**:
- `children`: Rooms that experience afternoon spikes on weekdays (Sons room, Daughters room)
- `parent`: Adult bedrooms with stable consumption patterns
- `common`: Shared spaces (Kitchen, Living room, Bathroom) with variable but predictable patterns

**Standard Rooms** (FR-002):
```python
STANDARD_ROOMS = [
    {"room_name": "Parents room", "room_type": "parent"},
    {"room_name": "Sons room", "room_type": "children"},
    {"room_name": "Daughters room", "room_type": "children"},
    {"room_name": "Kitchen", "room_type": "common"},
    {"room_name": "Living room", "room_type": "common"}
]
```

**Example**:
```json
{
  "room_name": "Sons room",
  "circuit_capacity_watts": 1800,
  "circuit_capacity_amps": 15,
  "baseline_wattage_min": 100,
  "baseline_wattage_max": 500,
  "room_type": "children"
}
```

---

### 3. BreakerEvent

Represents an instance when electrical load exceeds circuit capacity, causing (or risking) a breaker trip.

**Fields**:

| Field | Type | Description | Validation | Example |
|-------|------|-------------|------------|---------|
| `event_id` | String (UUID) | Unique identifier for the event | Required, UUID format | `"e4d3c2b1-..."` |
| `timestamp` | ISO 8601 DateTime String | When the overload occurred | Required, valid ISO 8601 | `"2025-12-05T15:35:00-05:00"` |
| `room_name` | String | Room where overload occurred | Required, must match existing room | `"Sons room"` |
| `peak_wattage` | Float | Maximum wattage during event | Required, must be > 1800 | `2150.0` |
| `peak_amperage` | Float | Maximum amperage during event | Required, must be > 15 | `17.92` |
| `duration_minutes` | Integer | How long overload lasted | Optional, >= 0 | `10` |
| `day_of_week` | String | Day when event occurred | Required, Mon-Sun | `"Wednesday"` |
| `time_of_day` | String (HH:MM) | Time when event started | Required, 24-hour format | `"15:35"` |

**Derived from PowerReading**:
```python
def detect_breaker_event(reading):
    """Create BreakerEvent from PowerReading if overload detected."""
    if reading.breaker_tripped:
        return BreakerEvent(
            event_id=generate_uuid(),
            timestamp=reading.timestamp,
            room_name=reading.room_name,
            peak_wattage=reading.wattage,
            peak_amperage=reading.amperage,
            duration_minutes=10,  # Single reading interval
            day_of_week=reading.timestamp.strftime("%A"),
            time_of_day=reading.timestamp.strftime("%H:%M")
        )
    return None
```

**Example**:
```json
{
  "event_id": "e4d3c2b1-a098-7654-3210-fedcba987654",
  "timestamp": "2025-12-05T15:35:00-05:00",
  "room_name": "Sons room",
  "peak_wattage": 2150.0,
  "peak_amperage": 17.92,
  "duration_minutes": 10,
  "day_of_week": "Thursday",
  "time_of_day": "15:35"
}
```

---

## Entity Relationships

```
Room (1) ----< (many) PowerReading
  |
  | 1:many
  v
BreakerEvent

- One Room has many PowerReadings (one per 10-minute interval)
- One Room can have many BreakerEvents
- BreakerEvents are derived from PowerReadings where breaker_tripped = true
```

**Relationship Rules**:
1. Each `PowerReading` must reference a valid `Room` via `room_name`
2. Each `BreakerEvent` must reference a valid `Room` via `room_name`
3. `BreakerEvent.timestamp` must match a `PowerReading.timestamp` where `breaker_tripped = true`

---

## CSV Schema (Data Contract)

The generated CSV file serves as the data contract between the data generation tool and the frontend visualization.

**Format**: RFC 4180 (standard CSV)

**Structure**:
```csv
timestamp,room_name,wattage,amperage,voltage,breaker_tripped
2025-12-01T00:00:00-05:00,Parents room,250.3,2.09,120,false
2025-12-01T00:10:00-05:00,Parents room,275.8,2.30,120,false
2025-12-01T15:30:00-05:00,Sons room,1950.0,16.25,120,true
...
```

**Column Definitions**:
1. `timestamp`: ISO 8601 with timezone offset (e.g., `-05:00` for EST)
2. `room_name`: String, no quotes unless contains comma
3. `wattage`: Float with up to 2 decimal places
4. `amperage`: Float with up to 2 decimal places
5. `voltage`: Integer (always 120)
6. `breaker_tripped`: Boolean as `true`/`false` (lowercase)

**File Specifications** (FR-001):
- **Header row**: Required (first row contains column names)
- **Record count**: 2,016 records per room (144 per day × 14 days)
- **Total records**: ~10,000 (2,016 × 5 rooms)
- **Sorting**: MUST be sorted by timestamp ascending, then room_name
- **Encoding**: UTF-8
- **Line endings**: CRLF (Windows) or LF (Unix) both acceptable
- **File size**: Estimated ~500KB-1MB

**Validation on Load** (Frontend):
```javascript
function validateCSV(data) {
  const requiredColumns = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped'];
  
  // Check headers
  const firstRow = data[0];
  const missingCols = requiredColumns.filter(col => !(col in firstRow));
  if (missingCols.length > 0) {
    throw new Error(`Missing columns: ${missingCols.join(', ')}`);
  }
  
  // Check data quality (per FR-022)
  let invalidCount = 0;
  data.forEach((row, index) => {
    if (row.wattage < 0 || row.wattage === null) {
      console.warn(`Row ${index}: Invalid wattage`);
      invalidCount++;
    }
  });
  
  if (invalidCount > 0) {
    console.warn(`${invalidCount} invalid records will be excluded from visualization`);
  }
  
  return data.filter(row => row.wattage >= 0 && row.wattage !== null);
}
```

---

## State Transitions

### BreakerEvent State Machine

```
[Normal Operation] --> [Overload Detected] --> [Breaker Trip] --> [Reset]
        ^                                                            |
        |_____________________________________________________________|
```

**States**:
1. **Normal Operation**: `wattage < 1800W`, `breaker_tripped = false`
2. **Overload Detected**: `wattage >= 1800W`, `breaker_tripped = true` (event generated)
3. **Breaker Trip**: Physical breaker opens (simulated in data, not tracked after event)
4. **Reset**: Next reading returns to baseline (electrician resets breaker, implicit)

**Transition Rules**:
- Normal → Overload: When `wattage` exceeds 1800W
- Overload → Breaker Trip: Immediate (same timestamp)
- Breaker Trip → Reset: Next 10-minute interval (returns to baseline 100-500W)

---

## Data Integrity Rules

1. **Temporal Consistency**: Timestamps must be monotonically increasing within each room
2. **Circuit Physics**: `amperage = wattage / voltage` (must be mathematically correct)
3. **Breaker Logic**: `breaker_tripped = true` if and only if `amperage > 15`
4. **No Gaps**: Exactly 10 minutes between consecutive readings for the same room
5. **Room Uniqueness**: Room names must be unique identifiers
6. **Voltage Constant**: Voltage must always be 120V (US residential standard)

---

## Summary Statistics

For the 14-day dataset:

| Metric | Value |
|--------|-------|
| Total Readings | ~10,000 (2,016 per room × 5 rooms) |
| Expected Breaker Events | 7-10 per children's room (70% of 10 weekdays) |
| Weekday Afternoon Events | ~14-20 total (both children's rooms) |
| Weekend Events | 0 (per requirements) |
| Time Span | 14 days (336 hours) |
| Sampling Rate | Every 10 minutes (144 samples/day) |

---

## Implementation Notes

### Python Data Generation
```python
from datetime import datetime, timedelta
import csv

class PowerReading:
    def __init__(self, timestamp, room_name, wattage):
        self.timestamp = timestamp
        self.room_name = room_name
        self.wattage = wattage
        self.voltage = 120
        self.amperage = wattage / 120
        self.breaker_tripped = self.amperage > 15.0
    
    def to_csv_row(self):
        return [
            self.timestamp.isoformat(),
            self.room_name,
            f"{self.wattage:.2f}",
            f"{self.amperage:.2f}",
            str(self.voltage),
            str(self.breaker_tripped).lower()
        ]
```

### JavaScript Frontend Parsing
```javascript
class PowerReading {
  constructor(csvRow) {
    this.timestamp = new Date(csvRow.timestamp);
    this.room_name = csvRow.room_name;
    this.wattage = parseFloat(csvRow.wattage);
    this.amperage = parseFloat(csvRow.amperage);
    this.voltage = parseInt(csvRow.voltage);
    this.breaker_tripped = csvRow.breaker_tripped === 'true';
  }
  
  isValid() {
    return this.wattage >= 0 && 
           !isNaN(this.timestamp.getTime()) &&
           this.room_name.length > 0;
  }
}
```

---

## Version History

- **v1.0** (2025-12-12): Initial data model definition
