/**
 * Data Loader Module
 * 
 * Handles CSV file loading, parsing with PapaParse, and validation.
 * Emits events when data is loaded or errors occur.
 * 
 * @module dataLoader
 */

import { eventBus, EVENTS } from './core/eventBus.js';

/**
 * Manages CSV file loading and data validation.
 */
export class DataLoader {
  constructor() {
    this.rawData = null;
    this.validatedData = null;
    this.errors = [];
    this.warnings = [];
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for file selection.
   */
  setupEventListeners() {
    // Listen for file selection from UI
    eventBus.on(EVENTS.FILE_SELECTED, (file) => this.loadFile(file));
  }

  /**
   * Handle file input selection.
   * 
   * @param {File} file - CSV file from file input
   */
  async loadFile(file) {
    if (!file) {
      this.showError('No file selected');
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.showError('Please select a CSV file');
      return;
    }

    // Show loading status
    this.updateStatus(`Loading ${file.name}...`);
    
    try {
      // Parse CSV using PapaParse with Web Worker
      const parsedData = await this.parseCSV(file);
      
      // Validate data
      const { validData, errors, warnings } = this.validateData(parsedData);
      
      this.validatedData = validData;
      this.errors = errors;
      this.warnings = warnings;
      
      if (errors.length > 0) {
        this.showError(`Data validation failed: ${errors.length} error(s) found`);
        this.displayErrors(errors);
        return;
      }
      
      if (warnings.length > 0) {
        this.displayWarnings(warnings);
      }
      
      // Success - emit data loaded event
      this.updateStatus(`✓ Loaded ${validData.length.toLocaleString()} records from ${file.name}`);
      
      eventBus.emit(EVENTS.DATA_LOADED, {
        data: validData,
        filename: file.name,
        recordCount: validData.length
      });
      
    } catch (error) {
      this.showError(`Failed to load file: ${error.message}`);
      console.error('File load error:', error);
    }
  }

  /**
   * Parse CSV file using PapaParse.
   * 
   * Uses Web Worker mode per research.md for non-blocking parsing.
   * 
   * @param {File} file - CSV file to parse
   * @returns {Promise<Array>} Parsed data rows
   */
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,              // First row = column names
        dynamicTyping: true,       // Auto-convert numbers
        skipEmptyLines: true,      // Ignore blank lines
        worker: true,              // Use Web Worker for performance
        
        complete: (results) => {
          if (results.errors.length > 0) {
            // Check for critical parsing errors
            const criticalErrors = results.errors.filter(e => e.type === 'FieldMismatch');
            if (criticalErrors.length > 0) {
              reject(new Error(`CSV parsing errors: ${criticalErrors[0].message}`));
              return;
            }
          }
          
          resolve(results.data);
        },
        
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Validate parsed CSV data per FR-022 minimal validation.
   * 
   * Rejects:
   * - Negative wattage
   * - Missing required fields (null/empty)
   * 
   * @param {Array} data - Parsed CSV rows
   * @returns {Object} { validData, errors, warnings }
   */
  validateData(data) {
    const validData = [];
    const errors = [];
    const warnings = [];
    
    const requiredFields = ['timestamp', 'room_name', 'wattage', 'amperage', 'voltage', 'breaker_tripped'];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const lineNumber = i + 2; // +2 for header row and 0-index
      
      // Check for missing required fields
      const missingFields = requiredFields.filter(field => 
        row[field] === null || row[field] === undefined || row[field] === ''
      );
      
      if (missingFields.length > 0) {
        errors.push(`Line ${lineNumber}: Missing required fields: ${missingFields.join(', ')}`);
        continue;
      }
      
      // Validate wattage is non-negative (FR-022)
      if (row.wattage < 0) {
        errors.push(`Line ${lineNumber}: Wattage cannot be negative (${row.wattage})`);
        continue;
      }
      
      // Validate amperage is non-negative
      if (row.amperage < 0) {
        errors.push(`Line ${lineNumber}: Amperage cannot be negative (${row.amperage})`);
        continue;
      }
      
      // Validate voltage is 120
      if (row.voltage !== 120) {
        warnings.push(`Line ${lineNumber}: Voltage is ${row.voltage}, expected 120V`);
      }
      
      // Validate mathematical consistency (with tolerance)
      const expectedAmperage = row.wattage / row.voltage;
      if (Math.abs(row.amperage - expectedAmperage) > 0.1) {
        warnings.push(`Line ${lineNumber}: Amperage mismatch (${row.amperage} vs expected ${expectedAmperage.toFixed(2)})`);
      }
      
      // Parse timestamp
      try {
        row.timestampObj = new Date(row.timestamp);
        if (isNaN(row.timestampObj.getTime())) {
          warnings.push(`Line ${lineNumber}: Invalid timestamp format: ${row.timestamp}`);
        }
      } catch (e) {
        warnings.push(`Line ${lineNumber}: Could not parse timestamp: ${row.timestamp}`);
      }
      
      // Valid row
      validData.push(row);
    }
    
    // Limit warnings to first 10 to avoid overwhelming user
    if (warnings.length > 10) {
      const remaining = warnings.length - 10;
      warnings.splice(10);
      warnings.push(`... and ${remaining} more warnings`);
    }
    
    return { validData, errors, warnings };
  }

  /**
   * Update status message in UI.
   * 
   * @param {string} message - Status message to display
   */
  updateStatus(message) {
    const statusEl = document.getElementById('fileStatus');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  /**
   * Show error message in UI.
   * 
   * @param {string} message - Error message
   */
  showError(message) {
    const errorEl = document.getElementById('errorDisplay');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    
    eventBus.emit(EVENTS.DATA_ERROR, { message });
  }

  /**
   * Display detailed error list in UI.
   * 
   * @param {Array<string>} errors - List of error messages
   */
  displayErrors(errors) {
    const errorEl = document.getElementById('errorDisplay');
    if (errorEl && errors.length > 0) {
      const errorList = errors.slice(0, 10); // Show first 10
      const remaining = errors.length - 10;
      
      let html = '<strong>Validation Errors:</strong><ul>';
      errorList.forEach(error => {
        html += `<li>${error}</li>`;
      });
      if (remaining > 0) {
        html += `<li>... and ${remaining} more errors</li>`;
      }
      html += '</ul>';
      
      errorEl.innerHTML = html;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Display warnings in UI.
   * 
   * @param {Array<string>} warnings - List of warning messages
   */
  displayWarnings(warnings) {
    const warningEl = document.getElementById('warningDisplay');
    if (warningEl && warnings.length > 0) {
      let html = '<strong>Data Quality Warnings:</strong><ul>';
      warnings.forEach(warning => {
        html += `<li>${warning}</li>`;
      });
      html += '</ul>';
      
      warningEl.innerHTML = html;
      warningEl.style.display = 'block';
    }
  }

  /**
   * Clear error and warning displays.
   */
  clearMessages() {
    const errorEl = document.getElementById('errorDisplay');
    const warningEl = document.getElementById('warningDisplay');
    
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
    
    if (warningEl) {
      warningEl.style.display = 'none';
      warningEl.textContent = '';
    }
  }
}
