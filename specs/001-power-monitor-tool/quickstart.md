# Quickstart Guide: Power Monitoring Analysis Tool

**Last Updated**: 2025-12-12  
**Estimated Setup Time**: 15-20 minutes

---

## Overview

The Power Monitoring Analysis Tool consists of two components:

1. **Python Data Generator**: Creates realistic 14-day time-series CSV data simulating residential power consumption with breaker trip patterns
2. **Web Visualization Frontend**: Interactive Highcharts-based dashboard for analyzing power consumption and identifying circuit breaker issues

---

## Prerequisites

### Required Software

| Component | Version | Purpose | Download |
|-----------|---------|---------|----------|
| **Python** | 3.8 or higher | Data generation script | [python.org](https://www.python.org/downloads/) |
| **Web Browser** | Chrome, Firefox, or Edge (latest) | Viewing visualization | Pre-installed on most systems |

### Optional Software

| Component | Purpose | When Needed |
|-----------|---------|-------------|
| **VS Code** | Code editing | If modifying generator or frontend |
| **Git** | Version control | If tracking changes |

---

## Quick Start (5 Minutes)

### Step 1: Generate Test Data

1. Open terminal/command prompt
2. Navigate to project root:
   ```bash
   cd c:\data\LNSSI\AI_test\powerMonitorTest2
   ```

3. Run data generator (once implemented):
   ```bash
   python data-generator/src/generator.py --output power-data.csv
   ```

4. Verify output:
   ```bash
   # Windows PowerShell
   Get-Content power-data.csv -Head 10
   
   # Linux/Mac
   head -10 power-data.csv
   ```

   Expected output:
   ```csv
   timestamp,room_name,wattage,amperage,voltage,breaker_tripped
   2025-12-01T00:00:00-05:00,Parents room,250.30,2.09,120,false
   ...
   ```

### Step 2: Open Visualization

1. Open `frontend/index.html` in your web browser:
   ```bash
   # Windows
   start frontend/index.html
   
   # Mac
   open frontend/index.html
   
   # Linux
   xdg-open frontend/index.html
   ```

2. Click **"Choose File"** button
3. Select `power-data.csv` from Step 1
4. View interactive power consumption charts

**That's it!** You should now see time-series charts showing power usage by room with breaker trip indicators.

---

## Detailed Setup

### Part 1: Python Data Generator Setup

#### Installation

No dependencies required - uses Python standard library only.

```bash
cd data-generator

# Optional: Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate
```

#### Configuration

Edit `data-generator/src/config.py` to customize:

```python
# Configuration options
ROOMS = [
    {"name": "Parents room", "type": "parent"},
    {"name": "Sons room", "type": "children"},
    {"name": "Daughters room", "type": "children"},
    {"name": "Kitchen", "type": "common"},
    {"name": "Living room", "type": "common"}
]

# Time range
START_DATE = "2025-12-01T00:00:00-05:00"  # Start of 14-day period
DAYS = 14                                  # Duration
INTERVAL_MINUTES = 10                      # Reading frequency

# Power consumption parameters
BASELINE_WATTS_MIN = 100
BASELINE_WATTS_MAX = 500
SPIKE_WATTS_MIN = 1800  # Breaker trips at 1800W (15A × 120V)
SPIKE_WATTS_MAX = 2200
```

#### Usage

```bash
# Basic usage
python src/generator.py --output power-data.csv

# With custom date range
python src/generator.py --output power-data.csv --start-date 2025-11-01 --days 14

# Verbose output
python src/generator.py --output power-data.csv --verbose
```

**Command-line Options**:

| Flag | Description | Default | Example |
|------|-------------|---------|---------|
| `--output` | Output CSV filename | `power-data.csv` | `--output results.csv` |
| `--start-date` | Start date (ISO 8601) | Today | `--start-date 2025-12-01` |
| `--days` | Number of days to generate | 14 | `--days 7` |
| `--verbose` | Print detailed progress | Off | `--verbose` |

#### Validation

Verify generated data:

```bash
# Count total records (should be ~10,000 for 5 rooms × 14 days)
# Windows PowerShell
(Get-Content power-data.csv | Measure-Object -Line).Lines - 1

# Linux/Mac
wc -l power-data.csv

# Check for breaker trips
# Windows PowerShell
Select-String -Path power-data.csv -Pattern ",true$"

# Linux/Mac
grep ",true$" power-data.csv | wc -l
```

Expected results:
- **Total records**: ~10,080 (2,016 per room × 5 rooms)
- **Breaker trips**: 14-20 events (weekday afternoons 3-4pm in children's rooms)

---

### Part 2: Frontend Visualization Setup

#### Installation

No installation required - pure client-side HTML/CSS/JavaScript.

#### File Structure Check

Ensure these files exist:

```
frontend/
├── index.html           # Main application page
├── css/
│   └── main.css        # Styles
├── js/
│   ├── main.js         # Application entry point
│   ├── dataLoader.js   # CSV parsing
│   ├── chartManager.js # Highcharts integration
│   ├── filterManager.js# Filtering logic
│   └── exportManager.js# Export functionality
└── lib/
    └── papaparse.min.js # CSV parsing library (or CDN link)
```

#### Configuration

No configuration needed for basic usage. Optional customization in `js/main.js`:

```javascript
// Chart appearance
const CHART_HEIGHT = 600;
const CHART_THEME = 'light'; // or 'dark'

// Color palette (colorblind-safe)
const ROOM_COLORS = [
  '#0173B2',  // Blue - Parents room
  '#DE8F05',  // Orange - Sons room
  '#029E73',  // Green - Daughters room
  '#CC78BC',  // Purple - Kitchen
  '#CA9161'   // Brown - Living room
];
```

#### Usage

1. **Open Application**:
   - Double-click `frontend/index.html`, or
   - Right-click → "Open with" → Chrome/Firefox/Edge

2. **Load Data**:
   - Click **"Choose File"** button
   - Select your generated CSV file
   - Wait 1-3 seconds for data to load and render

3. **Explore Data**:
   - **Hover** over chart lines to see exact wattage values
   - **Zoom**: Click and drag on chart to zoom into time range
   - **Pan**: Hold Shift and drag to pan left/right
   - **Toggle Rooms**: Click room names in legend to show/hide series
   - **Filter by Date**: Use date picker controls to focus on specific days
   - **Filter by Time**: Select time-of-day range (e.g., 3-4pm) to see patterns

4. **Export Data**:
   - **PNG**: Click "Export Chart" to download visualization
   - **PDF**: Click "Generate Report" for summary + charts
   - **CSV**: Click "Export Data" to download filtered dataset

---

## Common Use Cases

### Use Case 1: Identify Breaker Trip Pattern

**Goal**: Find when and where breaker trips occur

1. Load CSV data
2. Look for red markers on chart (breaker trip indicators)
3. Use date filter to examine specific week
4. Note that trips occur weekdays 3-4pm in children's rooms
5. Export filtered data for documentation

### Use Case 2: Compare Weekday vs Weekend

**Goal**: Confirm pattern is weekday-specific

1. Load CSV data
2. Apply filter: Monday-Friday only
3. Note afternoon spikes in chart
4. Reset filter, apply: Saturday-Sunday only
5. Observe absence of spikes
6. Export comparison screenshots

### Use Case 3: Analyze Single Room

**Goal**: Focus on one problematic room

1. Load CSV data
2. Click all room legends except target room (e.g., "Sons room")
3. Zoom into 3-4pm time window
4. Observe spike pattern across days
5. Export PDF report for electrician

---

## Troubleshooting

### Data Generator Issues

**Problem**: "Python not found"
- **Solution**: Install Python 3.8+ from [python.org](https://python.org) and add to PATH

**Problem**: "Permission denied" when writing CSV
- **Solution**: Run terminal as administrator, or write to different directory

**Problem**: Generated file is empty or too small
- **Solution**: Check for error messages in terminal output. Verify configuration in `config.py`

**Problem**: No breaker trips in data
- **Solution**: Ensure `START_DATE` includes weekdays. Verify spike configuration in `config.py`

### Frontend Issues

**Problem**: "File not found" or blank page
- **Solution**: Ensure all files in `frontend/` directory are present. Check browser console (F12) for errors

**Problem**: CSV fails to load
- **Solution**:
  - Verify CSV has header row: `timestamp,room_name,wattage,...`
  - Check file size (should be ~1MB for 10k records)
  - Open CSV in text editor to verify format

**Problem**: Charts don't render or are blank
- **Solution**:
  - Check browser console (F12) for JavaScript errors
  - Verify Highcharts library loaded (check Network tab in DevTools)
  - Ensure CSV contains valid data (not all zeros or nulls)

**Problem**: Slow performance or browser freeze
- **Solution**:
  - Ensure Highcharts Boost module is enabled
  - Reduce dataset size for testing (generate 7 days instead of 14)
  - Use Chrome or Edge (better performance than Firefox for large datasets)

**Problem**: Colors look the same (colorblind user)
- **Solution**: Colors are already optimized for colorblindness. If still problematic, adjust `ROOM_COLORS` in `main.js`

---

## Performance Expectations

| Metric | Target | Typical | Notes |
|--------|--------|---------|-------|
| **Data Generation** | < 5 seconds | 1-2 seconds | For 10k records |
| **CSV File Load** | < 3 seconds | < 1 second | With PapaParse + Web Worker |
| **Initial Chart Render** | < 3 seconds | 1-2 seconds | With Boost module enabled |
| **Zoom/Pan Response** | < 200ms | < 100ms | With data grouping |
| **File Size** | < 1.5 MB | ~850 KB | For 10k records |
| **Memory Usage (Browser)** | < 100 MB | 50-70 MB | With all charts loaded |

---

## Next Steps

After completing this quickstart:

1. **Review Documentation**:
   - [data-model.md](data-model.md) - Understand data structure
   - [contracts/csv-schema.md](contracts/csv-schema.md) - CSV format details
   - [research.md](research.md) - Technology decisions

2. **Run Tests** (if implemented):
   ```bash
   # Python tests
   cd data-generator
   pytest tests/

   # Frontend tests (manual)
   # Open tests/manual-test-plan.md and execute checklist
   ```

3. **Customize**:
   - Add more rooms in `config.py`
   - Adjust spike patterns (time, magnitude)
   - Modify chart colors and styling
   - Add new export formats

4. **Deploy/Share**:
   - Package frontend as ZIP for distribution
   - Share generated CSV files with team
   - Create documentation for end users

---

## Support & Resources

### Documentation

- **Implementation Plan**: [plan.md](plan.md)
- **Feature Specification**: [spec.md](spec.md)
- **Research Findings**: [research.md](research.md)

### External Resources

- **PapaParse Docs**: [papaparse.com](https://www.papaparse.com/)
- **Highcharts Docs**: [highcharts.com/docs](https://www.highcharts.com/docs/)
- **Python CSV Module**: [docs.python.org/3/library/csv.html](https://docs.python.org/3/library/csv.html)

### Getting Help

1. Check browser console (F12) for error messages
2. Review troubleshooting section above
3. Verify file structure matches expected layout
4. Ensure all prerequisites are installed

---

## Appendix: Manual Testing Checklist

Before sharing the tool, verify:

- [ ] Data generator creates 10k+ records
- [ ] CSV file opens correctly in Excel/text editor
- [ ] Breaker trips occur on weekdays 3-4pm in children's rooms
- [ ] No trips on weekend afternoons
- [ ] Frontend loads CSV without errors
- [ ] All charts render with distinct colors
- [ ] Zoom and pan work smoothly
- [ ] Legend toggles show/hide series correctly
- [ ] Date filters update chart appropriately
- [ ] Export buttons (PNG, PDF, CSV) work
- [ ] No console errors in browser (F12)
- [ ] Tested in at least 2 browsers (Chrome + one other)

---

**Version**: 1.0  
**Last Updated**: 2025-12-12
