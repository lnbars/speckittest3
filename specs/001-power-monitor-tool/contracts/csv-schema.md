# CSV Data Contract: Power Monitoring Data Format

**Version**: 1.0.0  
**Date**: 2025-12-12  
**Purpose**: Define the data contract between the Python data generator and the frontend visualization tool

---

## Overview

This contract defines the CSV file format used to exchange power monitoring data between the data generation tool and the web visualization application. Since this is a client-side-only architecture with no REST API, the CSV file serves as the data contract.

---

## File Metadata

| Property | Value |
|----------|-------|
| **Format** | CSV (Comma-Separated Values) |
| **Standard** | RFC 4180 |
| **Encoding** | UTF-8 |
| **Line Endings** | CRLF (Windows) or LF (Unix) - both accepted |
| **File Extension** | `.csv` |
| **MIME Type** | `text/csv` |
| **Header Row** | Required (first row contains column names) |
| **Delimiter** | Comma (`,`) |
| **Quote Character** | Double quote (`"`) for fields containing commas |
| **Null Values** | Not allowed in required fields; use empty string for optional fields |

---

## Schema Definition

### Column Specification

| Column | Data Type | Required | Constraints | Example |
|--------|-----------|----------|-------------|---------|
| `timestamp` | ISO 8601 DateTime | Yes | Valid ISO 8601 with timezone offset | `2025-12-01T15:30:00-05:00` |
| `room_name` | String | Yes | Non-empty, max 50 chars | `Sons room` |
| `wattage` | Float | Yes | >= 0.0 | `1850.50` |
| `amperage` | Float | Yes | >= 0.0, typically <= 20.0 | `15.42` |
| `voltage` | Integer | Yes | Must be 120 | `120` |
| `breaker_tripped` | Boolean | Yes | `true` or `false` (lowercase) | `true` |

### Column Details

#### 1. timestamp
- **Format**: ISO 8601 extended format with timezone offset
- **Timezone**: Should be consistent across entire dataset (recommend EST/EDT: `-05:00` or `-04:00`)
- **Precision**: Seconds (milliseconds optional but not required)
- **Sorting**: Must be sorted chronologically within each room
- **Example**: `2025-12-01T15:30:00-05:00`

#### 2. room_name
- **Case Sensitive**: Yes (`"Living Room"` ≠ `"living room"`)
- **Whitespace**: Preserved (leading/trailing trimmed by parser)
- **Special Characters**: Allowed, but avoid commas (will require quoting)
- **Uniqueness**: Not unique (multiple readings per room expected)
- **Standard Values**: `"Parents room"`, `"Sons room"`, `"Daughters room"`, `"Kitchen"`, `"Living room"`

#### 3. wattage
- **Unit**: Watts (W)
- **Precision**: Up to 2 decimal places recommended
- **Range**: 0.0 to 10,000.0 (practical limit for residential circuits)
- **Validation**: Must be non-negative (per FR-022)
- **Example**: `1850.50`

#### 4. amperage
- **Unit**: Amperes (A)
- **Precision**: Up to 2 decimal places recommended
- **Calculation**: Must equal `wattage / voltage` (mathematically consistent)
- **Range**: 0.0 to 20.0 (typical residential circuit range)
- **Example**: `15.42`

#### 5. voltage
- **Unit**: Volts (V)
- **Value**: Must always be `120` (US residential standard)
- **Justification**: All circuits in spec are 120V/15A residential circuits
- **Example**: `120`

#### 6. breaker_tripped
- **Type**: Boolean
- **Format**: Lowercase strings `"true"` or `"false"` (not `True`/`False` or `1`/`0`)
- **Logic**: Should be `true` when `amperage > 15.0`
- **Example**: `true`

---

## Example CSV File

```csv
timestamp,room_name,wattage,amperage,voltage,breaker_tripped
2025-12-01T00:00:00-05:00,Parents room,250.30,2.09,120,false
2025-12-01T00:00:00-05:00,Sons room,180.50,1.50,120,false
2025-12-01T00:00:00-05:00,Daughters room,220.00,1.83,120,false
2025-12-01T00:00:00-05:00,Kitchen,450.75,3.76,120,false
2025-12-01T00:00:00-05:00,Living room,320.00,2.67,120,false
2025-12-01T00:10:00-05:00,Parents room,275.80,2.30,120,false
2025-12-01T00:10:00-05:00,Sons room,195.25,1.63,120,false
2025-12-01T00:10:00-05:00,Daughters room,210.50,1.75,120,false
2025-12-01T00:10:00-05:00,Kitchen,480.00,4.00,120,false
2025-12-01T00:10:00-05:00,Living room,305.30,2.54,120,false
2025-12-05T15:30:00-05:00,Sons room,1950.00,16.25,120,true
2025-12-05T15:30:00-05:00,Daughters room,2050.00,17.08,120,true
```

---

## Data Quality Requirements

### Mandatory Validations (Producer Side - Python Generator)

1. **Temporal Consistency**:
   - Readings must be exactly 10 minutes apart within each room
   - No missing intervals over 14-day period (2,016 readings per room)
   - Timestamps must be chronologically ordered

2. **Mathematical Consistency**:
   - `amperage` must equal `wattage / voltage` (within 0.01 tolerance)
   - `breaker_tripped` must be `true` if `amperage > 15.0`
   - `voltage` must always be `120`

3. **Data Integrity**:
   - No null values in required fields
   - `wattage` and `amperage` must be >= 0
   - `room_name` must be non-empty string

### Consumer Validations (Frontend JavaScript)

Per FR-022, minimal validation on load:

```javascript
function validateCSVRow(row, lineNumber) {
  const errors = [];
  
  // Reject negative wattage
  if (row.wattage < 0) {
    errors.push({ line: lineNumber, field: 'wattage', message: 'Cannot be negative' });
  }
  
  // Reject null/missing required fields
  const required = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped'];
  required.forEach(field => {
    if (row[field] === null || row[field] === undefined || row[field] === '') {
      errors.push({ line: lineNumber, field, message: 'Required field missing' });
    }
  });
  
  return errors;
}
```

---

## File Size Specifications

| Specification | Value |
|---------------|-------|
| **Total Records** | ~10,000 (2,016 per room × 5 rooms) |
| **Columns** | 6 |
| **Average Row Size** | ~85-95 bytes (including line ending) |
| **Estimated File Size** | 850 KB - 1 MB |
| **Load Time Target** | < 3 seconds (per SC-005) |
| **Parse Time Target** | < 500 ms with PapaParse + Web Worker |

---

## Sorting Requirements

**Primary Sort**: `timestamp` (ascending)  
**Secondary Sort**: `room_name` (alphabetical, optional but recommended)

**Rationale**: Chronological sorting is critical for:
- Efficient time-series chart rendering
- Binary search during time-range filtering
- Sequential data processing without re-sorting

**Example Sorted Order**:
```
2025-12-01T00:00:00-05:00,Daughters room,...
2025-12-01T00:00:00-05:00,Kitchen,...
2025-12-01T00:00:00-05:00,Living room,...
2025-12-01T00:00:00-05:00,Parents room,...
2025-12-01T00:00:00-05:00,Sons room,...
2025-12-01T00:10:00-05:00,Daughters room,...
...
```

---

## Error Handling

### Producer Errors (Data Generator)
Should abort and report:
- Room configuration missing
- Time range calculation errors
- File write permission errors
- Invalid configuration parameters

### Consumer Errors (Frontend)
Should display inline messages per FR-022:

1. **File Read Errors**:
   - Display: "Unable to read file. Please select a valid CSV file."
   - Location: Chart area with warning icon

2. **Parse Errors**:
   - Display: "CSV format error on line X: [error message]"
   - Location: Inline banner above chart

3. **Validation Errors**:
   - Display: "Y invalid records excluded from visualization"
   - Location: Warning banner with details icon
   - Behavior: Skip invalid rows, continue with valid data

4. **Missing Columns**:
   - Display: "Missing required columns: [column list]"
   - Location: Chart area with error icon
   - Behavior: Block visualization, require valid file

---

## Versioning

**Current Version**: 1.0.0

**Schema Evolution Rules**:
- **Major version**: Breaking changes (column removal, type changes, format changes)
- **Minor version**: Backward-compatible additions (new optional columns)
- **Patch version**: Documentation clarifications, no schema changes

**Backward Compatibility**:
- Frontend must gracefully ignore unknown columns (future-proofing)
- New optional columns may be added without breaking existing consumers

**Version Header** (optional, for future use):
```csv
# CSV Schema Version: 1.0.0
timestamp,room_name,wattage,amperage,voltage,breaker_tripped
...
```

---

## Implementation References

### Python Producer Example
```python
import csv
from datetime import datetime

def write_power_data_csv(readings, filename):
    """Write PowerReading objects to CSV file."""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Write header
        writer.writerow(['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped'])
        
        # Write data rows
        for reading in sorted(readings, key=lambda r: (r.timestamp, r.room_name)):
            writer.writerow([
                reading.timestamp.isoformat(),
                reading.room_name,
                f"{reading.wattage:.2f}",
                f"{reading.amperage:.2f}",
                reading.voltage,
                str(reading.breaker_tripped).lower()
            ])
```

### JavaScript Consumer Example
```javascript
import Papa from 'papaparse';

function loadPowerMonitorCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,  // Auto-convert numbers
      skipEmptyLines: true,
      worker: true,
      transformHeader: (header) => header.trim(),
      transform: (value, field) => {
        // Convert boolean strings
        if (field === 'breaker_tripped') {
          return value === 'true';
        }
        return value;
      },
      complete: (results) => {
        // Validate required columns
        const required = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped'];
        const missing = required.filter(col => !(col in results.data[0]));
        
        if (missing.length > 0) {
          reject(new Error(`Missing columns: ${missing.join(', ')}`));
          return;
        }
        
        // Filter invalid rows
        const validData = results.data.filter(row => {
          return row.wattage >= 0 && row.wattage !== null;
        });
        
        resolve(validData);
      },
      error: (error) => reject(error)
    });
  });
}
```

---

## Testing & Validation

### Test Cases

1. **Valid File**: Standard 10k-record file with all fields correct
2. **Missing Column**: File missing `breaker_tripped` column
3. **Negative Wattage**: Row with `wattage = -100`
4. **Invalid Timestamp**: Row with `timestamp = "invalid"`
5. **Extra Columns**: File with additional unknown columns (should be ignored)
6. **Empty File**: File with header only, no data rows
7. **Large File**: File with 100k records (stress test)
8. **Special Characters**: Room name with comma: `"Living room, main"`

### Validation Checklist

Producer (Python):
- [ ] Generates exactly 2,016 records per room
- [ ] Timestamps are 10 minutes apart
- [ ] `amperage = wattage / 120` (within 0.01)
- [ ] `breaker_tripped` set correctly when `amperage > 15`
- [ ] File is UTF-8 encoded
- [ ] File is sorted by timestamp

Consumer (Frontend):
- [ ] Parses valid CSV without errors
- [ ] Displays error for missing columns
- [ ] Filters out rows with negative wattage
- [ ] Handles rows with null values gracefully
- [ ] Ignores extra/unknown columns
- [ ] Displays warning for invalid records

---

## Change Log

- **v1.0.0** (2025-12-12): Initial CSV schema definition
  - Defined 6 required columns
  - Established validation rules
  - Documented error handling requirements

---

## Contact & Governance

**Schema Owner**: Power Monitor Project Team  
**Review Cycle**: On-demand (one-off tool)  
**Change Process**: Update version number, document in Change Log, update implementation plan
