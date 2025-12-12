# Tasks: Power Monitoring Analysis Tool

**Input**: Design documents from `/specs/001-power-monitor-tool/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested in specification - Manual testing approach per research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Per plan.md structure:
- Python data generator: `data-generator/src/`, `data-generator/tests/`
- Frontend web app: `frontend/` (HTML/CSS/JS)
- Shared docs: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure (data-generator/, frontend/, docs/)
- [X] T002 [P] Initialize Python project structure in data-generator/ with src/ and tests/ subdirectories
- [X] T003 [P] Initialize frontend structure in frontend/ with index.html, css/, js/, lib/ subdirectories
- [X] T004 [P] Create requirements.txt in data-generator/ (pytest for testing)
- [X] T005 [P] Create .gitignore for Python cache files and generated CSV data
- [X] T006 [P] Create README.md in data-generator/ with usage instructions
- [X] T007 [P] Create README.md in frontend/ with setup and usage instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Create Room model class in data-generator/src/models.py with fields per data-model.md
- [X] T009 [P] Create PowerReading model class in data-generator/src/models.py with validation per data-model.md
- [X] T010 [P] Create BreakerEvent model class in data-generator/src/models.py for event tracking
- [X] T011 [P] Create configuration module in data-generator/src/config.py defining standard rooms (Parents room, Sons room, Daughters room, Kitchen, Living room)
- [X] T012 Create CSV writer utility in data-generator/src/csv_writer.py implementing RFC 4180 format per contracts/csv-schema.md
- [X] T013 Setup event bus pattern in frontend/js/core/eventBus.js per research.md architecture
- [X] T014 [P] Add Highcharts library to frontend/lib/ or configure CDN link in frontend/index.html
- [X] T015 [P] Add PapaParse library to frontend/lib/ or configure CDN link in frontend/index.html

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Test Data (Priority: P1) 🎯 MVP

**Goal**: Generate realistic 14-day time-series CSV data with weekday afternoon spikes in children's rooms

**Independent Test**: Run data generator and verify CSV contains 2016 records per room (144 records/day × 14 days) with weekday 3-4pm spikes exceeding 1800 watts in children's rooms only

### Implementation for User Story 1

- [X] T016 [US1] Implement time interval generation function in data-generator/src/generator.py (10-minute intervals over 14 days)
- [X] T017 [US1] Implement baseline power consumption generator in data-generator/src/generator.py (100-500 watts with normal variations)
- [X] T018 [US1] Implement weekday afternoon spike logic in data-generator/src/generator.py (1800-2200 watts for children's rooms, 3-4pm Mon-Fri only)
- [X] T019 [US1] Implement amperage calculation and breaker_tripped flag logic in data-generator/src/generator.py (amperage = wattage/120, tripped when > 15A)
- [X] T020 [US1] Implement main data generation orchestration in data-generator/src/generator.py (iterate rooms, generate full 14-day dataset per room)
- [X] T021 [US1] Create command-line interface in data-generator/src/generator.py with --output argument for CSV file path
- [X] T022 [US1] Integrate CSV writer to output data in format per contracts/csv-schema.md with proper headers and data types
- [X] T023 [US1] Add timezone handling for timestamps (use EST/EDT per csv-schema.md)
- [X] T024 [P] [US1] Create unit tests in data-generator/tests/test_generator.py for time interval generation
- [X] T025 [P] [US1] Create unit tests in data-generator/tests/test_generator.py for baseline power patterns
- [X] T026 [P] [US1] Create unit tests in data-generator/tests/test_generator.py for weekday spike detection
- [X] T027 [US1] Create CSV format validation tests in data-generator/tests/test_csv_writer.py verifying RFC 4180 compliance
- [X] T028 [US1] Create integration test in data-generator/tests/test_integration.py verifying full 14-day generation produces correct record count

**Checkpoint**: At this point, User Story 1 should be fully functional - can generate complete test CSV file independently

---

## Phase 4: User Story 2 - Visualize Time Series Data (Priority: P2)

**Goal**: Display interactive time series charts showing power consumption by room with breaker trip indicators

**Independent Test**: Load generated CSV into website and verify interactive charts display all rooms' wattage over time with tooltips, zoom/pan, and breaker trip markers

### Implementation for User Story 2

- [X] T029 [US2] Create HTML structure in frontend/index.html with file input control, chart container, and basic layout
- [X] T030 [P] [US2] Create base CSS styles in frontend/css/main.css for professional data analysis UI (typography, layout, color scheme)
- [X] T031 [P] [US2] Create chart-specific CSS in frontend/css/charts.css for Highcharts styling
- [X] T032 [US2] Implement file input handler in frontend/js/dataLoader.js to handle CSV file selection via file picker dialog
- [X] T033 [US2] Implement CSV parsing in frontend/js/dataLoader.js using PapaParse with worker mode per research.md
- [X] T034 [US2] Implement data validation in frontend/js/dataLoader.js (reject negative wattage, null required fields per FR-022)
- [X] T035 [US2] Emit 'data:loaded' event from frontend/js/dataLoader.js with parsed and validated data
- [X] T036 [US2] Create Highcharts configuration in frontend/js/chartManager.js with Boost module enabled per research.md
- [X] T037 [US2] Implement performance optimizations in frontend/js/chartManager.js (disable markers, turboThreshold: 5000, data grouping)
- [X] T038 [US2] Implement Paul Tol's Bright colorblind-safe palette in frontend/js/chartManager.js for room differentiation
- [X] T039 [US2] Implement time series rendering in frontend/js/chartManager.js (one series per room, wattage vs timestamp)
- [X] T040 [US2] Implement tooltip configuration in frontend/js/chartManager.js showing timestamp, room, wattage, amperage
- [X] T041 [US2] Implement breaker trip visual indicators in frontend/js/chartManager.js (red markers when breaker_tripped = true)
- [X] T042 [US2] Implement zoom and pan functionality in frontend/js/chartManager.js (zoomType: 'x', panning enabled)
- [X] T043 [US2] Implement room visibility toggle in frontend/js/chartManager.js (legend click to show/hide series)
- [X] T044 [US2] Create summary panel in frontend/index.html displaying total breaker trip count by room
- [X] T045 [US2] Implement summary statistics calculation in frontend/js/chartManager.js and update summary panel
- [X] T046 [US2] Create application initialization in frontend/js/main.js connecting all modules via event bus
- [X] T047 [US2] Add inline error display for CSV load failures in frontend/js/dataLoader.js (contextual messages per FR-022)
- [X] T048 [US2] Add inline warning display for data quality issues in frontend/js/dataLoader.js (missing intervals, invalid values)
- [X] T049 [US2] Implement responsive CSS breakpoints in frontend/css/main.css for tablet (768px+) and desktop

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - can generate data AND visualize it independently

---

## Phase 5: User Story 3 - Compare Weekday vs Weekend Patterns (Priority: P3)

**Goal**: Enable side-by-side or overlay comparison of weekday vs weekend consumption patterns

**Independent Test**: Activate comparison view and verify weekday data shows 3-4pm spikes that are absent in weekend overlay

### Implementation for User Story 3

- [X] T050 [US3] Add comparison view toggle control to frontend/index.html (button or checkbox)
- [X] T051 [US3] Implement weekday data aggregation function in frontend/js/utils.js (filter Monday-Friday records)
- [X] T052 [US3] Implement weekend data aggregation function in frontend/js/utils.js (filter Saturday-Sunday records)
- [X] T053 [US3] Extend chartManager in frontend/js/chartManager.js to support comparison mode (separate or overlaid series)
- [X] T054 [US3] Implement comparison view rendering in frontend/js/chartManager.js showing weekday vs weekend patterns
- [X] T055 [US3] Add comparison statistics panel to frontend/index.html showing peak wattage difference in 3-4pm window
- [X] T056 [US3] Calculate and display weekday vs weekend metrics in frontend/js/chartManager.js (max wattage, average during critical hours)
- [X] T057 [US3] Style comparison view controls and panels in frontend/css/main.css

**Checkpoint**: All user stories 1-3 should now be independently functional - complete analytical tool for weekday/weekend comparison

---

## Phase 6: User Story 4 - Filter and Search Data (Priority: P3)

**Goal**: Provide date range, time-of-day, and room filters to focus analysis on specific subsets

**Independent Test**: Apply various filters (date range, 3-4pm time window, specific rooms) and verify charts update to show only filtered subset

### Implementation for User Story 4

- [X] T058 [US4] Add filter panel to frontend/index.html with date range picker, time-of-day selector, and room checkboxes
- [X] T059 [P] [US4] Style filter panel in frontend/css/main.css for professional appearance and usability
- [X] T060 [US4] Create filterManager module in frontend/js/filterManager.js listening to 'data:loaded' event
- [X] T061 [US4] Implement date range filter in frontend/js/filterManager.js (filter records by start/end date)
- [X] T062 [US4] Implement time-of-day filter in frontend/js/filterManager.js (filter to specific hour ranges, e.g., 3-4pm)
- [X] T063 [US4] Implement room filter in frontend/js/filterManager.js (show/hide selected rooms)
- [X] T064 [US4] Emit 'filters:applied' event from frontend/js/filterManager.js with filtered dataset
- [X] T065 [US4] Update chartManager in frontend/js/chartManager.js to listen for 'filters:applied' and re-render with filtered data
- [X] T066 [US4] Implement filter reset button in frontend/index.html
- [X] T067 [US4] Implement reset functionality in frontend/js/filterManager.js to clear all filters and restore full dataset
- [X] T068 [US4] Add filter state indicator to frontend/index.html showing active filters count

**Checkpoint**: All user stories should now be independently functional - complete filtering and analysis capabilities

---

## Phase 7: Export Functionality (Cross-Cutting)

**Purpose**: Enable users to export findings per FR-021

- [X] T069 [P] Add export buttons to frontend/index.html (PNG, PDF, CSV export)
- [X] T070 [P] Create exportManager module in frontend/js/exportManager.js
- [X] T071 [P] Implement PNG screenshot export in frontend/js/exportManager.js using Highcharts built-in export
- [X] T072 [P] Implement PDF report generation in frontend/js/exportManager.js with summary stats and chart image
- [X] T073 [P] Implement filtered CSV data export in frontend/js/exportManager.js (export currently displayed subset)
- [X] T074 [P] Style export controls in frontend/css/main.css

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T075 [P] Create utility functions in frontend/js/utils.js (date formatting, validation helpers)
- [X] T076 [P] Add docstrings to all Python functions in data-generator/src/ (Google style per plan.md)
- [X] T077 [P] Add JSDoc comments to frontend JavaScript modules in frontend/js/
- [X] T078 [P] Test website in Chrome, Firefox, and Edge latest versions (per SC-008)
- [X] T079 Verify performance targets: CSV generation < 10 seconds, website load < 3 seconds, interactions < 200ms
- [X] T080 [P] Create manual test plan in frontend/tests/manual-test-plan.md covering all acceptance scenarios
- [X] T081 [P] Update docs/data-model.md if any entity changes were made during implementation
- [X] T082 [P] Verify quickstart.md instructions are accurate and complete
- [X] T083 Code cleanup: Remove debug console.logs, unused imports, commented code
- [X] T084 [P] Add Python linting configuration (.pylintrc or setup.cfg with flake8)
- [X] T085 [P] Add JavaScript linting configuration (.eslintrc.json)
- [X] T086 Run pylint/flake8 on Python code and fix issues
- [X] T087 Run ESLint on JavaScript code and fix issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
  - US2 requires US1's CSV output for testing but can be developed in parallel
  - US3 and US4 depend on US2's chart infrastructure
- **Export (Phase 7)**: Depends on US2 (chart visualization) completion
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Generate Test Data**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Visualize Time Series**: Can start after Foundational (Phase 2) - Can be developed in parallel with US1, requires US1's output for testing
- **User Story 3 (P3) - Compare Weekday/Weekend**: Depends on US2 (needs chart infrastructure) - Extends visualization
- **User Story 4 (P3) - Filter and Search**: Depends on US2 (needs chart infrastructure) - Can run parallel with US3

### Within Each User Story

- **US1 (Data Generation)**:
  - Models (T008-T010) before generator logic
  - Generator functions (T016-T019) can be developed in parallel, then orchestration (T020)
  - Tests (T024-T028) can run in parallel after implementation
  
- **US2 (Visualization)**:
  - HTML structure (T029) first
  - CSS files (T030-T031) can be created in parallel
  - DataLoader (T032-T035) and ChartManager (T036-T043) can be developed in parallel
  - Integration (T046) after both modules complete
  
- **US3 (Comparison)**: Linear within phase (T050→T057)
  
- **US4 (Filtering)**: UI (T058-T059) parallel with logic (T060-T063)

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks (T002-T007) can run in parallel

**Phase 2 (Foundational)**: 
- Python models (T008-T010) can run in parallel
- Frontend libraries (T014-T015) can run in parallel
- Event bus (T013) independent

**Phase 3 (User Story 1)**:
- Unit tests (T024-T026) can run in parallel after implementation
- Implementation tasks (T016-T019) can be developed in parallel if functions are independent

**Phase 4 (User Story 2)**:
- CSS files (T030-T031) can run in parallel
- DataLoader module and ChartManager module can be developed in parallel once architecture is clear

**Phase 7 (Export)**:
- All export tasks (T069-T074) can run in parallel (different features)

**Phase 8 (Polish)**:
- Documentation tasks (T076-T077) can run in parallel
- Linting configs (T084-T085) can run in parallel
- Most polish tasks are independent and can run in parallel

---

## Parallel Example: User Story 1

```bash
# After foundational models are ready, launch parallel implementation:
Task: "Implement time interval generation function in data-generator/src/generator.py"
Task: "Implement baseline power consumption generator in data-generator/src/generator.py"
Task: "Implement weekday afternoon spike logic in data-generator/src/generator.py"

# After implementation, launch parallel tests:
Task: "Unit tests for time interval generation"
Task: "Unit tests for baseline power patterns"
Task: "Unit tests for weekday spike detection"
```

---

## Parallel Example: User Story 2

```bash
# Launch CSS tasks in parallel:
Task: "Create base CSS in frontend/css/main.css"
Task: "Create chart CSS in frontend/css/charts.css"

# Once architecture defined, launch module development in parallel:
Task: "Implement CSV parsing in frontend/js/dataLoader.js"
Task: "Create Highcharts configuration in frontend/js/chartManager.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T015) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T016-T028) - Data generation
4. Complete Phase 4: User Story 2 (T029-T049) - Visualization
5. **STOP and VALIDATE**: Generate test data, load into website, verify 5-minute problem identification per SC-004
6. Deploy/demo if ready - THIS IS A FULLY FUNCTIONAL DIAGNOSTIC TOOL

**MVP Scope**: US1 + US2 provides complete value - electrician can generate data and visually identify the after-school spike pattern

### Incremental Delivery

1. Complete Setup + Foundational (T001-T015) → Foundation ready
2. Add User Story 1 (T016-T028) → Test independently → Can generate realistic CSV ✓
3. Add User Story 2 (T029-T049) → Test independently → Can visualize and identify pattern ✓ **MVP COMPLETE**
4. Add User Story 3 (T050-T057) → Test independently → Enhanced weekday/weekend comparison ✓
5. Add User Story 4 (T058-T068) → Test independently → Enhanced filtering capabilities ✓
6. Add Export (T069-T074) → Export findings ✓
7. Polish (T075-T087) → Production ready ✓

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T015)
2. **Once Foundational is done**:
   - Developer A: User Story 1 - Data Generation (T016-T028)
   - Developer B: User Story 2 - Visualization (T029-T049) [can start structure, needs US1 output for testing]
3. **After US2 complete**:
   - Developer A: User Story 3 - Comparison (T050-T057)
   - Developer B: User Story 4 - Filtering (T058-T068)
   - Developer C: Export functionality (T069-T074)
4. **Final polish**: Team reviews and completes Phase 8 together

---

## Task Summary

**Total Tasks**: 87

### Tasks by Phase:
- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundational): 8 tasks (BLOCKING)
- Phase 3 (User Story 1 - Generate Data): 13 tasks
- Phase 4 (User Story 2 - Visualize): 21 tasks
- Phase 5 (User Story 3 - Compare): 8 tasks
- Phase 6 (User Story 4 - Filter): 11 tasks
- Phase 7 (Export): 6 tasks
- Phase 8 (Polish): 13 tasks

### Tasks by User Story:
- **US1 (P1 - Generate Test Data)**: 13 tasks
- **US2 (P2 - Visualize Time Series)**: 21 tasks
- **US3 (P3 - Compare Weekday/Weekend)**: 8 tasks
- **US4 (P3 - Filter and Search)**: 11 tasks
- **Infrastructure (Setup + Foundational)**: 15 tasks
- **Cross-cutting (Export + Polish)**: 19 tasks

### Parallel Opportunities Identified:
- Phase 1: 6 tasks can run in parallel
- Phase 2: 5 tasks can run in parallel (in groups)
- Phase 3: Up to 6 tasks can run in parallel (tests + some implementation)
- Phase 4: Up to 4 tasks can run in parallel (CSS, modules)
- Phase 7: 5 tasks can run in parallel (different export features)
- Phase 8: Up to 10 tasks can run in parallel (documentation, linting)

### MVP Scope:
- **Recommended MVP**: Phase 1 + 2 + 3 + 4 (US1 + US2 only)
- **Task count**: 49 tasks (56% of total)
- **Delivers**: Complete diagnostic tool - generate data and identify breaker pattern within 5 minutes
- **Why sufficient**: Provides full value for the electrician's investigation - can answer "why does breaker blow daily?"

### Independent Test Criteria:
- **US1**: Generate CSV, verify 2016 records/room with weekday afternoon spikes > 1800W in children's rooms
- **US2**: Load CSV into website, verify interactive charts with zoom/pan/tooltips and breaker trip markers
- **US3**: Enable comparison view, verify weekday spike visible but absent on weekends
- **US4**: Apply filters (date range, 3-4pm, specific rooms), verify chart updates to show only filtered data

---

## Format Validation

✅ **All tasks follow the required checklist format**:
- Checkbox: `- [ ]` at start of every task
- Task ID: Sequential T001-T087
- [P] marker: Applied to 32 parallelizable tasks
- [Story] label: Applied to all tasks in US1-US4 phases (US1, US2, US3, US4)
- Description: Includes clear action and exact file path
- No story label: Correctly omitted for Setup, Foundational, Export, and Polish phases

**Examples**:
- `- [ ] T001 Create project directory structure (data-generator/, frontend/, docs/)`
- `- [ ] T016 [US1] Implement time interval generation function in data-generator/src/generator.py`
- `- [ ] T030 [P] [US2] Create base CSS styles in frontend/css/main.css`
- `- [ ] T069 [P] Add export buttons to frontend/index.html`

---

## Notes

- Tests are NOT included as separate TDD tasks because manual testing approach was approved per research.md
- Unit tests ARE included within US1 (T024-T028) for critical data generation validation
- Frontend testing relies on manual test plan (T080) per constitution waiver for one-off tools
- [P] tasks = different files, no dependencies, can execute in parallel
- [Story] label maps task to specific user story for traceability and independent delivery
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP (US1+US2) provides full diagnostic value - US3+US4 are enhancements
