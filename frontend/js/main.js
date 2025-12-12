/**
 * Main Application Entry Point
 * 
 * Initializes all modules and connects file input to event bus.
 * 
 * @module main
 */

import { eventBus, EVENTS } from './core/eventBus.js';
import { DataLoader } from './dataLoader.js';
import { ChartManager } from './chartManager.js';

/**
 * Initialize the application.
 */
function init() {
  console.log('⚡ Power Monitoring Analysis Tool - Initializing...');
  
  // Initialize modules
  const dataLoader = new DataLoader();
  const chartManager = new ChartManager();
  
  // Connect file input to event bus
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        // Clear previous messages
        dataLoader.clearMessages();
        
        // Emit file selected event
        eventBus.emit(EVENTS.FILE_SELECTED, file);
      }
    });
  }
  
  // Make file input label clickable
  const fileLabel = document.querySelector('label[for="csvFileInput"]');
  if (fileLabel) {
    fileLabel.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  // Connect comparison toggle
  const comparisonToggle = document.getElementById('comparisonToggle');
  if (comparisonToggle) {
    comparisonToggle.addEventListener('change', (event) => {
      if (event.target.checked) {
        eventBus.emit(EVENTS.COMPARISON_ENABLED);
      } else {
        eventBus.emit(EVENTS.COMPARISON_DISABLED);
      }
    });
  }
  
  console.log('✓ Application initialized');
  console.log('Ready to load CSV file');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
