# Power Monitoring Data Generator

Python CLI tool to generate realistic 14-day time-series CSV data for residential power monitoring analysis.

## Purpose

Creates test data showing:
- **Baseline consumption**: 100-500 watts for normal usage
- **Weekday afternoon spikes**: 1800-2200 watts in children's rooms (3-4pm, Mon-Fri)
- **Breaker trips**: When amperage exceeds 15A on 120V circuits

## Requirements

- Python 3.8 or higher
- pytest (for running tests)

## Installation

```bash
# Install dependencies
cd data-generator
pip install -r requirements.txt
```

## Usage

### Generate CSV Data

```bash
# Generate data to default location (output.csv)
python src/generator.py

# Specify custom output file
python src/generator.py --output power-data.csv

# Specify full path
python src/generator.py --output C:\data\my-analysis\power-data.csv
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_generator.py
```

## Output Format

CSV file with the following columns:
- `timestamp`: ISO 8601 datetime with timezone (EST/EDT)
- `room_name`: Room identifier (e.g., "Sons room", "Kitchen")
- `wattage`: Power consumption in watts
- `amperage`: Current in amperes (wattage/120)
- `voltage`: Circuit voltage (always 120 for US residential)
- `breaker_tripped`: Boolean indicating if circuit breaker tripped (amperage > 15)

## Data Specifications

- **Time period**: 14 days
- **Interval**: 10 minutes (144 readings per day)
- **Total records**: ~10,000 (2,016 per room × 5 rooms)
- **Rooms**: Parents room, Sons room, Daughters room, Kitchen, Living room

## Expected Patterns

- **Normal operation**: 100-500 watts baseline
- **Children's rooms (weekdays 3-4pm)**: 1800-2200 watts (gaming consoles, TVs)
- **Breaker trips**: Occur when wattage exceeds 1800W (15A × 120V)
- **Weekend afternoons**: No spikes (children playing outside)

## Architecture

```
data-generator/
├── src/
│   ├── generator.py      # Main CLI and orchestration
│   ├── models.py         # Data models (Room, PowerReading, BreakerEvent)
│   ├── csv_writer.py     # CSV output (RFC 4180 format)
│   └── config.py         # Configuration (room definitions)
├── tests/
│   ├── test_generator.py     # Unit tests for generation logic
│   ├── test_csv_writer.py    # CSV format validation
│   └── test_integration.py   # End-to-end tests
└── requirements.txt
```

## Example

```bash
# Generate test data
python src/generator.py --output test-data.csv

# Expected output:
# Generating power data for 5 rooms over 14 days...
# ✓ Parents room: 2,016 records
# ✓ Sons room: 2,016 records (68 breaker trips detected)
# ✓ Daughters room: 2,016 records (72 breaker trips detected)
# ✓ Kitchen: 2,016 records
# ✓ Living room: 2,016 records
# 
# Total: 10,080 records written to test-data.csv (942 KB)
```

## Documentation

- [Data Model](../docs/data-model.md): Entity definitions and relationships
- [CSV Schema](../specs/001-power-monitor-tool/contracts/csv-schema.md): Complete data contract
- [Technical Plan](../specs/001-power-monitor-tool/plan.md): Architecture and design decisions
