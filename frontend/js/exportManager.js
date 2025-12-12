/**
 * Export Manager Module
 * 
 * Manages data export functionality (PNG, PDF, CSV).
 * 
 * @module exportManager
 */

import { eventBus, EVENTS } from './core/eventBus.js';

/**
 * Manages export functionality for charts and data.
 */
export class ExportManager {
  constructor(chartManager) {
    this.chartManager = chartManager;
    this.currentData = null;
    this.setupEventListeners();
    this.setupUIHandlers();
  }

  /**
   * Set up event listeners.
   */
  setupEventListeners() {
    // Listen for data loaded
    eventBus.on(EVENTS.DATA_LOADED, (payload) => {
      this.currentData = payload.data;
      this.showExportSection();
    });
    
    // Listen for filtered data
    eventBus.on(EVENTS.FILTERS_APPLIED, (filteredData) => {
      this.currentData = filteredData;
    });
  }

  /**
   * Set up UI event handlers.
   */
  setupUIHandlers() {
    // PNG export
    const pngBtn = document.getElementById('exportPNG');
    if (pngBtn) {
      pngBtn.addEventListener('click', () => this.exportPNG());
    }
    
    // PDF export
    const pdfBtn = document.getElementById('exportPDF');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => this.exportPDF());
    }
    
    // CSV export
    const csvBtn = document.getElementById('exportCSV');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  /**
   * Show export section.
   */
  showExportSection() {
    const section = document.getElementById('exportSection');
    if (section) {
      section.style.display = 'block';
    }
  }

  /**
   * Export chart as PNG using Highcharts built-in functionality.
   */
  exportPNG() {
    try {
      eventBus.emit(EVENTS.EXPORT_STARTED, { format: 'PNG' });
      
      if (!this.chartManager || !this.chartManager.chart) {
        this.showError('No chart available to export');
        return;
      }

      // Use Highcharts built-in export
      this.chartManager.chart.exportChart({
        type: 'image/png',
        filename: `power-monitoring-${this.getTimestamp()}`
      });

      eventBus.emit(EVENTS.EXPORT_COMPLETED, { format: 'PNG' });
    } catch (error) {
      console.error('PNG export failed:', error);
      this.showError('Failed to export PNG: ' + error.message);
      eventBus.emit(EVENTS.EXPORT_FAILED, { format: 'PNG', error });
    }
  }

  /**
   * Export report as PDF with summary statistics and chart.
   */
  async exportPDF() {
    try {
      eventBus.emit(EVENTS.EXPORT_STARTED, { format: 'PDF' });
      
      if (!this.chartManager || !this.chartManager.chart) {
        this.showError('No chart available to export');
        return;
      }

      // Get chart as SVG
      const svg = this.chartManager.chart.getSVG({
        chart: {
          backgroundColor: '#ffffff'
        }
      });

      // Get summary statistics
      const stats = this.chartManager.calculateStatistics(this.currentData);

      // Create PDF content
      const pdfContent = this.generatePDFContent(svg, stats);

      // For simple PDF generation, we'll use the browser's print functionality
      // This creates a printable page that can be saved as PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Trigger print dialog after content loads
      printWindow.onload = () => {
        printWindow.print();
      };

      eventBus.emit(EVENTS.EXPORT_COMPLETED, { format: 'PDF' });
    } catch (error) {
      console.error('PDF export failed:', error);
      this.showError('Failed to export PDF: ' + error.message);
      eventBus.emit(EVENTS.EXPORT_FAILED, { format: 'PDF', error });
    }
  }

  /**
   * Generate PDF content as HTML for printing.
   * 
   * @param {string} svg - Chart SVG
   * @param {Object} stats - Summary statistics
   * @returns {string} HTML content
   */
  generatePDFContent(svg, stats) {
    const timestamp = new Date().toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Power Monitoring Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
          }
          h1 {
            color: #0f172a;
            margin: 0;
            font-size: 24px;
          }
          .timestamp {
            color: #64748b;
            font-size: 12px;
            margin-top: 10px;
          }
          .summary {
            margin-bottom: 30px;
          }
          .summary h2 {
            color: #0f172a;
            font-size: 18px;
            margin-bottom: 15px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }
          .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
          }
          .chart-container {
            margin-top: 30px;
            text-align: center;
          }
          .chart-container svg {
            max-width: 100%;
            height: auto;
          }
          .trips-list {
            margin-top: 20px;
          }
          .trips-list ul {
            list-style: none;
            padding: 0;
          }
          .trips-list li {
            padding: 8px;
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            margin-bottom: 8px;
          }
          @media print {
            body {
              padding: 0;
            }
            .header {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚡ Power Monitoring Analysis Report</h1>
          <div class="timestamp">Generated: ${timestamp}</div>
        </div>

        <div class="summary">
          <h2>Summary Statistics</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Records</div>
              <div class="stat-value">${stats.totalRecords.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Rooms Monitored</div>
              <div class="stat-value">${stats.roomCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Breaker Trips</div>
              <div class="stat-value" style="color: #ef4444">${stats.totalTrips}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Peak Power</div>
              <div class="stat-value">${stats.maxWattage.toFixed(0)}W</div>
              <div class="stat-label" style="font-size: 10px">${stats.maxWattageRoom}</div>
            </div>
            ${stats.dateRange.start && stats.dateRange.end ? `
            <div class="stat-card">
              <div class="stat-label">Date Range</div>
              <div class="stat-value">${Math.ceil((stats.dateRange.end - stats.dateRange.start) / (1000 * 60 * 60 * 24))} days</div>
              <div class="stat-label" style="font-size: 10px">
                ${stats.dateRange.start.toLocaleDateString()} - ${stats.dateRange.end.toLocaleDateString()}
              </div>
            </div>
            ` : ''}
          </div>

          ${Object.keys(stats.tripsByRoom).length > 0 ? `
          <div class="trips-list">
            <strong>Breaker Trips by Room:</strong>
            <ul>
              ${Object.entries(stats.tripsByRoom)
                .sort((a, b) => b[1] - a[1])
                .map(([room, count]) => `<li>${room}: <strong>${count}</strong> trips</li>`)
                .join('')}
            </ul>
          </div>
          ` : ''}
        </div>

        <div class="chart-container">
          <h2>Power Consumption Over Time</h2>
          ${svg}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Export current data as CSV file.
   */
  exportCSV() {
    try {
      eventBus.emit(EVENTS.EXPORT_STARTED, { format: 'CSV' });
      
      if (!this.currentData || this.currentData.length === 0) {
        this.showError('No data available to export');
        return;
      }

      // Generate CSV content
      const csv = this.generateCSV(this.currentData);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `power-monitoring-export-${this.getTimestamp()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      eventBus.emit(EVENTS.EXPORT_COMPLETED, { format: 'CSV' });
    } catch (error) {
      console.error('CSV export failed:', error);
      this.showError('Failed to export CSV: ' + error.message);
      eventBus.emit(EVENTS.EXPORT_FAILED, { format: 'CSV', error });
    }
  }

  /**
   * Generate CSV content from data.
   * 
   * @param {Array} data - Data to export
   * @returns {string} CSV content
   */
  generateCSV(data) {
    // CSV header
    const header = 'timestamp,room_name,wattage,amperage,voltage,breaker_tripped\n';
    
    // CSV rows
    const rows = data.map(row => {
      const timestamp = row.timestamp;
      const roomName = this.escapeCSV(row.room_name);
      const wattage = row.wattage;
      const amperage = row.amperage;
      const voltage = row.voltage;
      const breakerTripped = row.breaker_tripped;
      
      return `${timestamp},${roomName},${wattage},${amperage},${voltage},${breakerTripped}`;
    }).join('\n');
    
    return header + rows;
  }

  /**
   * Escape CSV field if it contains special characters.
   * 
   * @param {string} field - Field value
   * @returns {string} Escaped field
   */
  escapeCSV(field) {
    if (typeof field !== 'string') {
      return field;
    }
    
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    
    return field;
  }

  /**
   * Get timestamp string for filenames.
   * 
   * @returns {string} Timestamp in YYYY-MM-DD-HHmmss format
   */
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Show error message to user.
   * 
   * @param {string} message - Error message
   */
  showError(message) {
    const errorEl = document.getElementById('errorDisplay');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    }
  }
}
