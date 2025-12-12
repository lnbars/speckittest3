# Manual Test Plan: Power Monitoring Analysis Tool

**Version**: 1.0  
**Date**: December 12, 2025  
**Tester**: _____________  
**Browser**: _____________  
**Test Date**: _____________

---

## Pre-Test Setup

- [ ] Clone/download project repository
- [ ] Verify sample CSV file exists at `frontend/sample-data/sample-power-data.csv`
- [ ] Open `frontend/index.html` in browser
- [ ] Open browser developer console (F12) to check for errors

---

## User Story 1: Generate Test Data (P1 - MVP)

### Test Case 1.1: Generate 14-Day CSV Data

**Objective**: Verify data generator creates correct CSV file with expected format and record count

**Steps**:
1. Navigate to `data-generator/` directory
2. Run: `python src/generator.py --output test-output.csv`
3. Verify file `test-output.csv` is created
4. Open file in text editor or Excel

**Expected Results**:
- [ ] File created successfully in <10 seconds
- [ ] CSV has header row: `timestamp,room_name,wattage,amperage,voltage,breaker_tripped`
- [ ] Exactly 10,080 total records (2,016 per room × 5 rooms)
- [ ] All timestamps are valid ISO 8601 format
- [ ] Room names match: Parents room, Sons room, Daughters room, Kitchen, Living room
- [ ] Wattage values are positive numbers
- [ ] Voltage is consistently 120
- [ ] Amperage calculated correctly (wattage/120)
- [ ] breaker_tripped is true when amperage > 15

### Test Case 1.2: Verify Weekday Afternoon Spikes

**Objective**: Confirm weekday 3-4pm spikes in children's rooms only

**Steps**:
1. Open generated CSV in spreadsheet software
2. Filter for "Sons room" and "Daughters room"
3. Filter timestamps for 15:00-16:00 hours
4. Separate weekday (Mon-Fri) vs weekend (Sat-Sun) records
5. Check wattage values

**Expected Results**:
- [ ] Weekday 3-4pm: Sons room shows spikes 1800-2200W
- [ ] Weekday 3-4pm: Daughters room shows spikes 1800-2200W
- [ ] Weekend 3-4pm: Both rooms show baseline 100-500W
- [ ] Parents room: No spikes any time (100-500W)
- [ ] Kitchen/Living room: No spikes any time (100-500W)

---

## User Story 2: Visualize Time Series Data (P2)

### Test Case 2.1: Load CSV File

**Objective**: Verify CSV file loading and parsing

**Steps**:
1. Open `frontend/index.html` in browser
2. Click "Load CSV File" button
3. Select the generated CSV file
4. Wait for processing

**Expected Results**:
- [ ] File loads within 3 seconds
- [ ] No errors in console
- [ ] Chart section becomes visible
- [ ] Summary statistics section appears
- [ ] Chart displays with data

### Test Case 2.2: Chart Visualization

**Objective**: Verify chart displays correctly with all required features

**Steps**:
1. After loading CSV, examine the chart

**Expected Results**:
- [ ] Chart shows time (X-axis) vs wattage (Y-axis)
- [ ] One series per room (5 total)
- [ ] Each room has distinct color
- [ ] Red dashed line at 1800W (breaker capacity)
- [ ] Legend shows all room names
- [ ] Chart title present: "Power Consumption Over Time"

### Test Case 2.3: Interactive Features

**Objective**: Test zoom, pan, and tooltip functionality

**Steps**:
1. Hover over data points
2. Click and drag to zoom in
3. Hold Shift and drag to pan
4. Click legend items

**Expected Results**:
- [ ] Tooltip appears on hover showing: timestamp, room, wattage, amperage
- [ ] Zoom functionality works (interactions < 200ms)
- [ ] Pan functionality works with Shift key
- [ ] Legend toggles room visibility (click to hide/show)
- [ ] Chart smoothly updates after each interaction

### Test Case 2.4: Summary Statistics

**Objective**: Verify summary panel accuracy

**Steps**:
1. Review summary statistics panel

**Expected Results**:
- [ ] Total records: 10,080
- [ ] Rooms: 5
- [ ] Total breaker trips count shown
- [ ] Peak power value shown with room name
- [ ] Time period: 14 days
- [ ] Date range displayed correctly
- [ ] Breaker trips by room list shown (if any trips occurred)

---

## User Story 3: Compare Weekday vs Weekend Patterns (P3)

### Test Case 3.1: Enable Comparison Mode

**Objective**: Verify comparison toggle activates weekday/weekend view

**Steps**:
1. Load CSV data
2. Locate "Enable Weekday vs Weekend Comparison" checkbox
3. Check the box

**Expected Results**:
- [ ] Comparison section becomes visible
- [ ] Chart updates to show weekday and weekend series
- [ ] Weekday series shown as solid lines
- [ ] Weekend series shown as dashed lines (60% opacity)
- [ ] Each room has both weekday and weekend variants
- [ ] Chart legend updated with "(Weekday)" and "(Weekend)" labels

### Test Case 3.2: Comparison Statistics

**Objective**: Verify 3-4pm comparison statistics accuracy

**Steps**:
1. With comparison mode enabled, review statistics table

**Expected Results**:
- [ ] Table shows all rooms
- [ ] "Weekday Peak" column shows 3-4pm max wattage
- [ ] "Weekend Peak" column shows 3-4pm max wattage
- [ ] "Difference" column shows weekday - weekend
- [ ] "% Increase" column calculated correctly
- [ ] Children's rooms highlighted (>500W difference)
- [ ] Warning shown for rooms exceeding 1800W capacity

### Test Case 3.3: Disable Comparison Mode

**Objective**: Verify toggling off returns to normal view

**Steps**:
1. Uncheck comparison checkbox

**Expected Results**:
- [ ] Chart returns to normal view (single series per room)
- [ ] Comparison statistics table hidden
- [ ] Chart renders smoothly

---

## User Story 4: Filter and Search Data (P3)

### Test Case 4.1: Date Range Filter

**Objective**: Verify date filtering works correctly

**Steps**:
1. Load CSV data
2. In Filters section, set Start Date to first date in dataset
3. Set End Date to 7 days later (first week)
4. Click "Apply Filters"

**Expected Results**:
- [ ] Chart updates to show only first week of data
- [ ] Summary statistics reflect filtered range
- [ ] Filter status shows "X filter(s) active"
- [ ] Chart interaction remains smooth (< 200ms)

### Test Case 4.2: Time-of-Day Filter

**Objective**: Verify hour range filtering

**Steps**:
1. Set Start Hour to "3 PM"
2. Set End Hour to "4 PM"
3. Click "Apply Filters"

**Expected Results**:
- [ ] Chart shows only 3-4pm data points
- [ ] Weekday spikes in children's rooms visible
- [ ] Other hours hidden
- [ ] Filter status updated

### Test Case 4.3: Room Filter

**Objective**: Verify room selection filtering

**Steps**:
1. Uncheck all rooms except "Sons room"
2. Click "Apply Filters"

**Expected Results**:
- [ ] Chart shows only Sons room data
- [ ] Other rooms hidden
- [ ] Summary statistics for Sons room only
- [ ] Filter status indicates active filter

### Test Case 4.4: Combined Filters

**Objective**: Verify multiple filters work together

**Steps**:
1. Set date range: First week
2. Set time: 3 PM - 4 PM
3. Select only: Sons room, Daughters room
4. Click "Apply Filters"

**Expected Results**:
- [ ] Chart shows only children's rooms during 3-4pm in first week
- [ ] Weekday spikes clearly visible
- [ ] Filter status shows "3 filters active"
- [ ] Chart accurate and responsive

### Test Case 4.5: Reset Filters

**Objective**: Verify reset restores full dataset

**Steps**:
1. With multiple filters active, click "Reset All Filters"

**Expected Results**:
- [ ] All date inputs cleared
- [ ] All time selects reset to "Any time"
- [ ] All room checkboxes checked
- [ ] Chart shows full dataset
- [ ] Filter status: "No filters active"
- [ ] Chart updates smoothly

---

## Export Functionality (Cross-Cutting)

### Test Case 5.1: PNG Export

**Objective**: Verify PNG chart export

**Steps**:
1. Load data and view chart
2. Click "Export Chart as PNG" button
3. Check downloads folder

**Expected Results**:
- [ ] PNG file downloads automatically
- [ ] Filename includes timestamp
- [ ] Image shows full chart with all visible data
- [ ] High resolution suitable for presentations
- [ ] No errors in console

### Test Case 5.2: PDF Export

**Objective**: Verify PDF report generation

**Steps**:
1. Load data and view chart
2. Click "Export Report as PDF" button
3. Review print preview

**Expected Results**:
- [ ] Print dialog opens
- [ ] Preview shows complete report
- [ ] Report includes: Title, timestamp, summary statistics, chart
- [ ] Statistics accurate (records, rooms, trips, peak power)
- [ ] Breaker trips by room list included
- [ ] Chart image high quality (SVG)
- [ ] Can save as PDF

### Test Case 5.3: CSV Export

**Objective**: Verify filtered data export

**Steps**:
1. Load data
2. Apply filters (e.g., first week, 3-4pm, specific rooms)
3. Click "Export Data as CSV" button
4. Open downloaded CSV

**Expected Results**:
- [ ] CSV file downloads with timestamp in filename
- [ ] File contains only filtered data
- [ ] CSV format matches original (same columns)
- [ ] Data accurate and complete for filtered subset
- [ ] Can open in Excel/Google Sheets

---

## Cross-Browser Testing (SC-008)

### Test Case 6.1: Chrome Compatibility

**Browser**: Google Chrome (latest version)

**Steps**:
1. Open `frontend/index.html` in Chrome
2. Run all User Story test cases (1-4)
3. Test all export functions

**Expected Results**:
- [ ] All features work correctly
- [ ] No console errors
- [ ] Chart renders properly
- [ ] Interactions smooth
- [ ] Exports functional

### Test Case 6.2: Firefox Compatibility

**Browser**: Mozilla Firefox (latest version)

**Steps**:
1. Open `frontend/index.html` in Firefox
2. Run all User Story test cases (1-4)
3. Test all export functions

**Expected Results**:
- [ ] All features work correctly
- [ ] No console errors
- [ ] Chart renders properly
- [ ] Interactions smooth
- [ ] Exports functional

### Test Case 6.3: Edge Compatibility

**Browser**: Microsoft Edge (latest version)

**Steps**:
1. Open `frontend/index.html` in Edge
2. Run all User Story test cases (1-4)
3. Test all export functions

**Expected Results**:
- [ ] All features work correctly
- [ ] No console errors
- [ ] Chart renders properly
- [ ] Interactions smooth
- [ ] Exports functional

---

## Performance Testing (SC-004, SC-005, SC-006)

### Test Case 7.1: Data Generation Performance

**Target**: < 10 seconds for 14-day, 5-room dataset

**Steps**:
1. Time the data generation command
2. Record duration

**Result**: _____ seconds
- [ ] PASS (< 10 seconds)
- [ ] FAIL (>= 10 seconds)

### Test Case 7.2: Website Load Performance

**Target**: < 3 seconds to load and render full dataset

**Steps**:
1. Clear browser cache
2. Open `index.html`
3. Load sample CSV (10,080 records)
4. Time from file selection to chart render complete

**Result**: _____ seconds
- [ ] PASS (< 3 seconds)
- [ ] FAIL (>= 3 seconds)

### Test Case 7.3: Interaction Performance

**Target**: < 200ms for zoom, pan, filter operations

**Steps**:
1. Use browser DevTools Performance tab
2. Record zoom operation
3. Record pan operation
4. Record filter application
5. Measure response times

**Results**:
- Zoom: _____ ms [ ] PASS [ ] FAIL
- Pan: _____ ms [ ] PASS [ ] FAIL
- Filter: _____ ms [ ] PASS [ ] FAIL

---

## Edge Cases and Error Handling

### Test Case 8.1: Invalid CSV File

**Steps**:
1. Create a text file with invalid CSV content
2. Try to load it

**Expected Results**:
- [ ] Error message displays
- [ ] Message explains the problem
- [ ] Application remains functional

### Test Case 8.2: Empty CSV File

**Steps**:
1. Create empty CSV file with just headers
2. Try to load it

**Expected Results**:
- [ ] Error message displays
- [ ] Application doesn't crash
- [ ] Can load valid file after

### Test Case 8.3: CSV with Missing Fields

**Steps**:
1. Create CSV with some null/missing required fields
2. Load the file

**Expected Results**:
- [ ] Warning message displays
- [ ] Invalid rows rejected per FR-022
- [ ] Valid rows still processed

### Test Case 8.4: Large Dataset

**Steps**:
1. Generate 30-day dataset (20,160 records)
2. Load into application

**Expected Results**:
- [ ] File loads successfully
- [ ] Chart renders with performance optimizations
- [ ] Interactions remain responsive
- [ ] No browser memory issues

---

## Responsive Design Testing

### Test Case 9.1: Desktop Display (1920x1080)

**Steps**:
1. View application at 1920x1080 resolution

**Expected Results**:
- [ ] Layout uses full width effectively
- [ ] Charts large and readable
- [ ] Filter controls well-organized
- [ ] No horizontal scrolling

### Test Case 9.2: Tablet Display (768px)

**Steps**:
1. Resize browser to 768px width or use tablet device

**Expected Results**:
- [ ] Layout adjusts to tablet size
- [ ] Controls remain accessible
- [ ] Chart resizes appropriately
- [ ] Text remains readable

---

## Accessibility Testing

### Test Case 10.1: Keyboard Navigation

**Steps**:
1. Navigate entire application using only keyboard (Tab, Enter, Arrow keys)

**Expected Results**:
- [ ] Can select file input with keyboard
- [ ] Can toggle filters with keyboard
- [ ] Can activate buttons with Enter/Space
- [ ] Focus indicators visible
- [ ] Logical tab order

### Test Case 10.2: Screen Reader Compatibility

**Steps**:
1. Enable screen reader
2. Navigate application

**Expected Results**:
- [ ] All buttons have aria-labels
- [ ] Input fields properly labeled
- [ ] Chart has descriptive alt text
- [ ] Error messages announced

---

## Test Summary

**Date Completed**: _____________  
**Tester Name**: _____________  
**Browser Tested**: _____________

### Pass/Fail Summary

- User Story 1: [ ] PASS [ ] FAIL
- User Story 2: [ ] PASS [ ] FAIL
- User Story 3: [ ] PASS [ ] FAIL
- User Story 4: [ ] PASS [ ] FAIL
- Export Functionality: [ ] PASS [ ] FAIL
- Cross-Browser: [ ] PASS [ ] FAIL
- Performance: [ ] PASS [ ] FAIL
- Edge Cases: [ ] PASS [ ] FAIL
- Responsive Design: [ ] PASS [ ] FAIL
- Accessibility: [ ] PASS [ ] FAIL

### Issues Found

| #  | Severity | Description | Status |
|----|----------|-------------|--------|
| 1  |          |             |        |
| 2  |          |             |        |
| 3  |          |             |        |

### Notes

_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

### Sign-Off

**Tester**: _____________________ **Date**: __________  
**Approved By**: _____________________ **Date**: __________
