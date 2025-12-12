/**
 * Filter Manager Module
 * 
 * Manages data filtering by date range, time-of-day, and room selection.
 * 
 * @module filterManager
 */

import { eventBus, EVENTS } from './core/eventBus.js';

/**
 * Manages data filtering functionality.
 */
export class FilterManager {
  constructor() {
    this.allData = null;
    this.availableRooms = [];
    this.activeFilters = {
      startDate: null,
      endDate: null,
      startHour: null,
      endHour: null,
      rooms: new Set()
    };
    
    this.setupEventListeners();
    this.setupUIHandlers();
  }

  /**
   * Set up event listeners for data loading.
   */
  setupEventListeners() {
    // Listen for data loaded
    eventBus.on(EVENTS.DATA_LOADED, (payload) => {
      this.allData = payload.data;
      this.extractAvailableRooms();
      this.populateRoomCheckboxes();
      this.showFilterSection();
      this.updateFilterStatus();
    });
  }

  /**
   * Set up UI event handlers for filter controls.
   */
  setupUIHandlers() {
    // Apply filters button
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applyFilters());
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetFilters());
    }
    
    // Date inputs
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate) {
      startDate.addEventListener('change', () => this.captureFilterState());
    }
    if (endDate) {
      endDate.addEventListener('change', () => this.captureFilterState());
    }
    
    // Time inputs
    const startHour = document.getElementById('startHour');
    const endHour = document.getElementById('endHour');
    if (startHour) {
      startHour.addEventListener('change', () => this.captureFilterState());
    }
    if (endHour) {
      endHour.addEventListener('change', () => this.captureFilterState());
    }
  }

  /**
   * Show the filter section.
   */
  showFilterSection() {
    const section = document.getElementById('filtersSection');
    if (section) {
      section.style.display = 'block';
    }
  }

  /**
   * Extract unique room names from data.
   */
  extractAvailableRooms() {
    if (!this.allData) return;
    
    const roomSet = new Set();
    this.allData.forEach(row => {
      if (row.room_name) {
        roomSet.add(row.room_name);
      }
    });
    
    this.availableRooms = Array.from(roomSet).sort();
  }

  /**
   * Populate room checkboxes dynamically.
   */
  populateRoomCheckboxes() {
    const container = document.getElementById('roomCheckboxes');
    if (!container || this.availableRooms.length === 0) return;
    
    container.innerHTML = '';
    
    this.availableRooms.forEach(room => {
      const label = document.createElement('label');
      label.className = 'room-checkbox-label';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = room;
      checkbox.checked = true; // All rooms selected by default
      checkbox.addEventListener('change', () => this.captureFilterState());
      
      const span = document.createElement('span');
      span.textContent = room;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  /**
   * Capture current filter state from UI.
   */
  captureFilterState() {
    // Date range
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    this.activeFilters.startDate = startDateInput?.value || null;
    this.activeFilters.endDate = endDateInput?.value || null;
    
    // Time of day
    const startHourInput = document.getElementById('startHour');
    const endHourInput = document.getElementById('endHour');
    this.activeFilters.startHour = startHourInput?.value ? parseInt(startHourInput.value) : null;
    this.activeFilters.endHour = endHourInput?.value ? parseInt(endHourInput.value) : null;
    
    // Rooms
    const checkboxes = document.querySelectorAll('#roomCheckboxes input[type="checkbox"]');
    this.activeFilters.rooms.clear();
    checkboxes.forEach(cb => {
      if (cb.checked) {
        this.activeFilters.rooms.add(cb.value);
      }
    });
  }

  /**
   * Apply filters to data and emit filtered dataset.
   */
  applyFilters() {
    if (!this.allData) return;
    
    // Capture current filter state
    this.captureFilterState();
    
    // Apply filters
    let filteredData = [...this.allData];
    
    // Date range filter
    if (this.activeFilters.startDate || this.activeFilters.endDate) {
      filteredData = this.filterByDateRange(filteredData);
    }
    
    // Time of day filter
    if (this.activeFilters.startHour !== null || this.activeFilters.endHour !== null) {
      filteredData = this.filterByTimeOfDay(filteredData);
    }
    
    // Room filter
    if (this.activeFilters.rooms.size > 0 && this.activeFilters.rooms.size < this.availableRooms.length) {
      filteredData = this.filterByRoom(filteredData);
    }
    
    // Update status
    this.updateFilterStatus();
    
    // Emit filtered data
    eventBus.emit(EVENTS.FILTERS_APPLIED, filteredData);
  }

  /**
   * Filter data by date range.
   * 
   * @param {Array} data - Data to filter
   * @returns {Array} Filtered data
   */
  filterByDateRange(data) {
    const startDate = this.activeFilters.startDate ? new Date(this.activeFilters.startDate) : null;
    const endDate = this.activeFilters.endDate ? new Date(this.activeFilters.endDate) : null;
    
    // Set end date to end of day
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }
    
    return data.filter(row => {
      try {
        const timestamp = row.timestampObj || new Date(row.timestamp);
        
        if (startDate && timestamp < startDate) {
          return false;
        }
        if (endDate && timestamp > endDate) {
          return false;
        }
        
        return true;
      } catch (error) {
        console.warn('Invalid timestamp:', row.timestamp);
        return false;
      }
    });
  }

  /**
   * Filter data by time of day.
   * 
   * @param {Array} data - Data to filter
   * @returns {Array} Filtered data
   */
  filterByTimeOfDay(data) {
    const startHour = this.activeFilters.startHour;
    const endHour = this.activeFilters.endHour;
    
    return data.filter(row => {
      try {
        const timestamp = row.timestampObj || new Date(row.timestamp);
        const hour = timestamp.getHours();
        
        if (startHour !== null && hour < startHour) {
          return false;
        }
        if (endHour !== null && hour >= endHour) {
          return false;
        }
        
        return true;
      } catch (error) {
        console.warn('Invalid timestamp:', row.timestamp);
        return false;
      }
    });
  }

  /**
   * Filter data by selected rooms.
   * 
   * @param {Array} data - Data to filter
   * @returns {Array} Filtered data
   */
  filterByRoom(data) {
    return data.filter(row => {
      return this.activeFilters.rooms.has(row.room_name);
    });
  }

  /**
   * Reset all filters to default state.
   */
  resetFilters() {
    // Clear date inputs
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    
    // Clear time inputs
    const startHourInput = document.getElementById('startHour');
    const endHourInput = document.getElementById('endHour');
    if (startHourInput) startHourInput.value = '';
    if (endHourInput) endHourInput.value = '';
    
    // Check all room checkboxes
    const checkboxes = document.querySelectorAll('#roomCheckboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = true;
    });
    
    // Clear active filters
    this.activeFilters = {
      startDate: null,
      endDate: null,
      startHour: null,
      endHour: null,
      rooms: new Set(this.availableRooms)
    };
    
    // Update status
    this.updateFilterStatus();
    
    // Emit cleared filters event
    eventBus.emit(EVENTS.FILTERS_CLEARED);
    
    // Apply filters (which will restore full dataset)
    if (this.allData) {
      eventBus.emit(EVENTS.FILTERS_APPLIED, this.allData);
    }
  }

  /**
   * Update filter status indicator.
   */
  updateFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    if (!statusEl) return;
    
    const activeCount = this.countActiveFilters();
    
    if (activeCount === 0) {
      statusEl.textContent = 'No filters active';
      statusEl.className = 'filter-status';
    } else {
      statusEl.textContent = `${activeCount} filter${activeCount > 1 ? 's' : ''} active`;
      statusEl.className = 'filter-status active';
    }
  }

  /**
   * Count number of active filters.
   * 
   * @returns {number} Count of active filters
   */
  countActiveFilters() {
    let count = 0;
    
    if (this.activeFilters.startDate || this.activeFilters.endDate) {
      count++;
    }
    
    if (this.activeFilters.startHour !== null || this.activeFilters.endHour !== null) {
      count++;
    }
    
    if (this.activeFilters.rooms.size > 0 && this.activeFilters.rooms.size < this.availableRooms.length) {
      count++;
    }
    
    return count;
  }
}
