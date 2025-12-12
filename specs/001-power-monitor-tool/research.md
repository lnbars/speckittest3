# Research: Power Monitoring Analysis Tool

**Date**: 2025-12-12  
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context and Constitution Check

---

## 1. CSV Parsing Library for Frontend

### Decision: **PapaParse**

### Rationale
- **Performance**: Handles 10,000 records in ~100-200ms (well under 3-second requirement)
- **File Input Support**: Native support for HTML `<input type="file">` File objects
- **Worker Support**: Can parse in Web Worker to prevent UI blocking
- **API Simplicity**: Clean, promise-based API with minimal configuration
- **License**: MIT License (free for any use)
- **Maintenance**: Actively maintained, 12k+ GitHub stars
- **Size**: 12KB gzipped (minimal overhead)

### Basic Implementation
```javascript
Papa.parse(file, {
    header: true,                  // First row = column names
    dynamicTyping: true,           // Auto-convert numbers
    skipEmptyLines: true,
    worker: true,                  // Use Web Worker
    complete: function(results) {
        // results.data = [{timestamp, room_name, wattage, ...}, ...]
        processData(results.data);
    }
});
```

### Alternatives Considered
- **d3-dsv**: Smaller (7KB) but lacks worker support and requires manual FileReader setup
- **csv-parser**: Node.js only, doesn't work in browser
- **CSV.js**: Unmaintained since 2014

### Recommendation
Use PapaParse via CDN: `<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>`

---

## 2. Client-Side Modular JavaScript Architecture

### Decision: **ES6 Modules with Event Bus Pattern**

### Rationale
- **Native browser support**: No transpilation or build tools required initially
- **Standard syntax**: Future-proof, easy migration to bundlers later
- **Decoupling**: Event bus eliminates direct dependencies between modules
- **Testability**: Mock event bus for unit testing each module in isolation
- **Flexibility**: Easy to add/remove modules without affecting others

### Architecture Pattern

**Event Bus (core/eventBus.js)**:
```javascript
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback) { /* subscribe */ }
  emit(event, data) { /* publish */ }
  off(event, callback) { /* unsubscribe */ }
}
export const eventBus = new EventBus();
```

**Module Structure** (e.g., dataLoader.js):
```javascript
import { eventBus } from '../core/eventBus.js';

export class DataLoader {
  constructor() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    eventBus.on('file:selected', (file) => this.loadFile(file));
  }
  
  async loadFile(file) {
    // ... load data ...
    eventBus.emit('data:loaded', data);
  }
}
```

**Communication Flow**:
- User clicks file input → UI emits `file:selected`
- DataLoader listens, loads CSV, emits `data:loaded`
- ChartManager listens, renders chart, emits `chart:rendered`
- FilterManager listens, prepares filters, emits `filters:ready`

### Testing Strategy
Mock event bus for unit tests:
```javascript
class MockEventBus {
  events = {};
  on(event, cb) { this.events[event] = cb; }
  emit(event, data) { this.events[event]?.(data); }
}
```

### Alternatives Considered
- **Revealing Module Pattern (IIFE)**: Legacy, harder to test
- **Dependency Injection**: More explicit but tighter coupling
- **State Management Library**: Overkill for 4-5 modules

### Migration Path
If complexity grows, add Vite (zero-config ES6 module bundler):
```bash
npm install -D vite
npm run dev  # Hot reload, TypeScript support if needed
```

---

## 3. Highcharts Performance Best Practices

### Decision: **Enable Boost Module + Disable Markers + Data Grouping**

### Rationale
- **10-100x performance improvement** with Boost module (WebGL rendering)
- **Sub-200ms interactions** achieved by disabling markers and animations
- **Smooth zoom/pan** via data grouping (aggregates points when zoomed out)

### Critical Configuration

```javascript
import Highcharts from 'highcharts';
import HighchartsBoost from 'highcharts/modules/boost';
HighchartsBoost(Highcharts);

const chartConfig = {
  boost: {
    useGPUTranslations: true,
    seriesThreshold: 5,        // Enable for 5+ series
  },
  
  plotOptions: {
    series: {
      turboThreshold: 5000,    // Skip expensive calcs for >5k points
      boostThreshold: 2000,    // WebGL render at 2k+ points/series
      marker: { enabled: false }, // CRITICAL: markers kill performance
      animation: false,        // Faster initial render
      dataGrouping: {
        enabled: true,
        approximation: 'average',
        units: [['minute', [1, 5, 15, 30]], ['hour', [1, 3, 6]]]
      }
    }
  },
  
  chart: {
    animation: false,
    zoomType: 'x',
    panning: { enabled: true, type: 'x' }
  },
  
  tooltip: {
    shared: true,              // Better performance than split
    animation: false
  }
};
```

### Colorblind-Safe Palette

**Paul Tol's Bright Palette** (7 colors, optimized for all colorblindness types):
```javascript
const colors = [
  '#0173B2',  // Blue
  '#DE8F05',  // Orange
  '#029E73',  // Teal/Green
  '#CC78BC',  // Purple
  '#CA9161',  // Brown
  '#ECE133',  // Yellow
  '#56B4E9'   // Light Blue
];
```

### Data Format Optimization
Use `[timestamp, wattage]` arrays instead of objects:
```javascript
// Fast ✅
series.data = [[1609459200000, 1200], [1609459800000, 1350]];

// Slow ❌
series.data = [{x: 1609459200000, y: 1200}, {x: 1609459800000, y: 1350}];
```

### Performance Targets
- **Initial render**: < 3 seconds (achievable with boost: ~500ms-1s)
- **Zoom/pan**: < 200ms (achievable with data grouping and no markers)
- **Memory**: ~2-5MB for 10k points × 7 series (acceptable)

### Known Limitations
- **No SVG export in boost mode** (exports as canvas instead)
- **No individual point click events** (acceptable for time-series analysis)
- **Requires WebGL** (IE11 not supported, but not required per spec)

### Alternatives Considered
- **Plotly.js**: Comparable performance but 3.5MB vs 1.5MB for Highcharts
- **Chart.js**: Lighter but lacks advanced time-series features (data grouping, boost)
- **D3.js**: Too low-level, would require significant custom code

---

## 4. Frontend Testing Strategy

### Decision: **Hybrid - Structured Manual Testing + Optional Minimal Smoke Tests**

### Rationale
- **One-off tool lifespan**: Days/weeks usage doesn't justify 8-14 hour Jest setup
- **Visual validation needed**: Chart correctness requires human review (automated tests miss visual bugs)
- **Low complexity**: 4 modules with clear responsibilities, minimal integration
- **Acceptable risk**: Tool failure impacts debugging workflow, not production systems
- **Cost/benefit**: Manual test plan (1 hour) vs Jest setup (8-14 hours) for temporary tool

### Recommended Approach

**1. Structured Manual Test Plan** (`tests/manual-test-plan.md`):
```markdown
## Test Scenarios
### Data Loading
- [ ] Load valid CSV → success
- [ ] Load invalid CSV → error message
- [ ] Large file (>1MB) → loads < 5 seconds

### Chart Visualization  
- [ ] All series render with correct colors
- [ ] Zoom/pan works smoothly
- [ ] Tooltips show accurate values

### Filtering
- [ ] Date range filter updates chart
- [ ] Room toggle shows/hides series
- [ ] Clear filters returns to full dataset

### Export
- [ ] PNG export captures current view
- [ ] PDF report includes summary stats
- [ ] CSV export matches filtered data
```

**2. Optional Minimal Smoke Tests** (`tests/smoke-tests.js`):
```javascript
// No Jest needed - run in browser console
const smokeTests = {
  testDataLoader: () => {
    const csv = "timestamp,wattage\n100,200";
    const result = parseCSV(csv);
    console.assert(result.length === 1, "Parsed 1 row");
  },
  runAll: () => { /* execute all tests */ }
};
```

### Constitution Waiver Justification

**Request variance from 70% test coverage requirement:**

**Justification**:
1. **Temporary nature**: Tool discarded after diagnostics complete
2. **No backend**: 50% of typical testing surface eliminated
3. **Visual-dominant**: Chart bugs better caught by visual review
4. **Single user**: No team coordination or shared API contracts
5. **Low risk**: Failure impacts debugging process, not customer-facing systems

**Alternative quality assurance**:
- Manual test plan covering 100% of user scenarios
- Pre-release checklist execution
- Browser console error monitoring
- Cross-browser spot check (Chrome + Firefox)

### Minimum Testing Requirements (Non-Negotiable)
1. ✅ Each module tested once with real data
2. ✅ Error conditions verified (bad CSV, missing files)
3. ✅ Browser console checked for errors
4. ✅ Manual test plan executed before sharing

### Time Investment
- **Manual testing**: 20-30 minutes per release
- **Jest setup**: Would require 8-14 hours (unjustified for one-off tool)

### Alternatives Considered
- **Full Jest suite**: Over-engineering for temporary tool
- **No testing**: Too risky even for one-off (missing validation could waste investigation time)
- **Playwright E2E**: Overkill, requires significant setup

---

## Summary of Technology Choices

| Decision Area | Choice | Alternative | Rationale |
|--------------|--------|-------------|-----------|
| **CSV Parsing** | PapaParse | d3-dsv | Worker support, cleaner API |
| **Architecture** | ES6 Modules + Event Bus | Dependency Injection | Better decoupling, testability |
| **Charting** | Highcharts + Boost | Plotly.js | Performance, data grouping |
| **Colors** | Paul Tol Bright | Wong palette | 7 colors, all colorblindness types |
| **Testing** | Manual + Smoke Tests | Jest full suite | Cost/benefit for one-off tool |

---

## Open Questions Resolved

1. **CSV parsing library** → PapaParse (resolved)
2. **Client-side architecture without backend** → ES6 modules + event bus (resolved)
3. **Highcharts performance optimization** → Boost module + markers disabled + data grouping (resolved)
4. **Frontend testing approach** → Structured manual testing with constitution waiver (resolved)

All NEEDS CLARIFICATION items from Technical Context have been resolved.
