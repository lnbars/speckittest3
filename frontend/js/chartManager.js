/**
 * Chart Manager Module
 * 
 * Manages Highcharts configuration, rendering, and interactions.
 * Implements performance optimizations and Paul Tol's colorblind-safe palette.
 * 
 * @module chartManager
 */

import { eventBus, EVENTS } from './core/eventBus.js';

/**
 * Paul Tol's Bright colorblind-safe palette
 * Source: https://personal.sron.nl/~pault/
 */
const COLOR_PALETTE = [
  '#4477AA', // Blue
  '#EE6677', // Red
  '#228833', // Green
  '#CCBB44', // Yellow
  '#66CCEE', // Cyan
  '#AA3377', // Purple
  '#BBBBBB'  // Grey
];

/**
 * Manages Highcharts visualization.
 */
export class ChartManager {
  constructor() {
    this.chart = null;
    this.allData = null;
    this.currentData = null;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners.
   */
  setupEventListeners() {
    // Listen for data loaded
    eventBus.on(EVENTS.DATA_LOADED, (payload) => {
      this.allData = payload.data;
      this.currentData = payload.data;
      this.renderChart();
      this.updateSummary();
    });
    
    // Listen for filter changes
    eventBus.on(EVENTS.FILTERS_APPLIED, (filteredData) => {
      this.currentData = filteredData;
      this.renderChart();
      this.updateSummary();
    });
  }

  /**
   * Render the Highcharts time series chart.
   */
  renderChart() {
    if (!this.currentData || this.currentData.length === 0) {
      return;
    }

    // Show chart section
    document.getElementById('chartSection').style.display = 'block';
    document.getElementById('summary').style.display = 'block';

    // Prepare data by room
    const seriesData = this.prepareSeriesData(this.currentData);
    
    // Create or update chart
    if (this.chart) {
      // Update existing chart
      this.chart.series.forEach((series, index) => {
        if (seriesData[index]) {
          series.setData(seriesData[index].data, false);
        }
      });
      this.chart.redraw();
    } else {
      // Create new chart
      this.chart = Highcharts.chart('chartContainer', this.getChartConfig(seriesData));
    }

    eventBus.emit(EVENTS.CHART_RENDERED, { seriesCount: seriesData.length });
  }

  /**
   * Prepare data organized by room for chart series.
   * 
   * @param {Array} data - Validated power reading data
   * @returns {Array} Series configuration objects
   */
  prepareSeriesData(data) {
    // Group data by room
    const roomData = {};
    
    data.forEach(row => {
      if (!roomData[row.room_name]) {
        roomData[row.room_name] = [];
      }
      
      // Convert timestamp to milliseconds for Highcharts
      const timestamp = row.timestampObj ? row.timestampObj.getTime() : new Date(row.timestamp).getTime();
      
      roomData[row.room_name].push({
        x: timestamp,
        y: row.wattage,
        amperage: row.amperage,
        breaker_tripped: row.breaker_tripped === 'true' || row.breaker_tripped === true
      });
    });

    // Convert to series array
    const series = [];
    let colorIndex = 0;
    
    Object.keys(roomData).sort().forEach(roomName => {
      series.push({
        name: roomName,
        data: roomData[roomName],
        color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
        marker: {
          enabled: false  // Performance optimization
        }
      });
      colorIndex++;
    });

    return series;
  }

  /**
   * Get Highcharts configuration with performance optimizations.
   * 
   * @param {Array} seriesData - Prepared series data
   * @returns {Object} Highcharts configuration
   */
  getChartConfig(seriesData) {
    return {
      // Performance optimizations
      boost: {
        enabled: true,
        useGPUTranslations: true,
        seriesThreshold: 1
      },
      
      chart: {
        type: 'line',
        zoomType: 'x',
        panning: true,
        panKey: 'shift',
        animation: false  // Performance
      },

      title: {
        text: 'Power Consumption Over Time',
        style: {
          fontSize: '1.5rem',
          fontWeight: '600'
        }
      },

      subtitle: {
        text: 'Click and drag to zoom, Shift+drag to pan. Click legend to show/hide rooms.'
      },

      xAxis: {
        type: 'datetime',
        title: {
          text: 'Time'
        },
        dateTimeLabelFormats: {
          day: '%b %e',
          week: '%b %e',
          month: '%b %Y'
        }
      },

      yAxis: {
        title: {
          text: 'Power Consumption (Watts)'
        },
        plotLines: [{
          value: 1800,
          color: '#ef4444',
          width: 2,
          dashStyle: 'Dash',
          label: {
            text: 'Circuit Capacity (1800W)',
            align: 'right',
            style: {
              color: '#ef4444'
            }
          },
          zIndex: 5
        }]
      },

      tooltip: {
        shared: true,
        crosshairs: true,
        formatter: function() {
          let html = '<b>' + Highcharts.dateFormat('%A, %b %e, %Y %H:%M', this.x) + '</b><br/>';
          
          this.points.forEach(point => {
            const breaker = point.point.breaker_tripped;
            const breakerIcon = breaker ? ' ⚠️' : '';
            
            html += '<span style="color:' + point.color + '">●</span> ';
            html += point.series.name + ': <b>' + point.y.toFixed(2) + 'W</b>';
            html += ' (' + point.point.amperage.toFixed(2) + 'A)';
            html += breakerIcon + '<br/>';
          });
          
          return html;
        }
      },

      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal'
      },

      plotOptions: {
        series: {
          turboThreshold: 5000,  // Performance: handle up to 5000 points
          marker: {
            enabled: false,  // Disable for performance
            states: {
              hover: {
                enabled: true,
                radius: 4
              }
            }
          },
          states: {
            hover: {
              lineWidthPlus: 0  // Don't increase line width on hover
            }
          },
          point: {
            events: {
              // Add breaker trip markers
              mouseOver: function() {
                if (this.breaker_tripped) {
                  // Could add special hover effect for breaker trips
                }
              }
            }
          }
        },
        line: {
          lineWidth: 2
        }
      },

      series: seriesData,

      credits: {
        enabled: false
      },

      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: [
              'viewFullscreen',
              'separator',
              'downloadPNG',
              'downloadJPEG',
              'downloadPDF',
              'downloadSVG'
            ]
          }
        }
      }
    };
  }

  /**
   * Update summary statistics panel.
   */
  updateSummary() {
    if (!this.currentData) return;

    // Calculate statistics
    const stats = this.calculateStatistics(this.currentData);
    
    // Update summary panel
    const summaryEl = document.getElementById('summaryStats');
    if (summaryEl) {
      summaryEl.innerHTML = this.renderSummaryHTML(stats);
    }
  }

  /**
   * Calculate summary statistics from data.
   * 
   * @param {Array} data - Power reading data
   * @returns {Object} Statistics object
   */
  calculateStatistics(data) {
    const stats = {
      totalRecords: data.length,
      rooms: new Set(),
      tripsByRoom: {},
      maxWattage: 0,
      maxWattageRoom: '',
      dateRange: { start: null, end: null }
    };

    data.forEach(row => {
      stats.rooms.add(row.room_name);
      
      // Count breaker trips
      if (row.breaker_tripped === 'true' || row.breaker_tripped === true) {
        stats.tripsByRoom[row.room_name] = (stats.tripsByRoom[row.room_name] || 0) + 1;
      }
      
      // Track max wattage
      if (row.wattage > stats.maxWattage) {
        stats.maxWattage = row.wattage;
        stats.maxWattageRoom = row.room_name;
      }
      
      // Track date range
      const timestamp = row.timestampObj || new Date(row.timestamp);
      if (!stats.dateRange.start || timestamp < stats.dateRange.start) {
        stats.dateRange.start = timestamp;
      }
      if (!stats.dateRange.end || timestamp > stats.dateRange.end) {
        stats.dateRange.end = timestamp;
      }
    });

    stats.roomCount = stats.rooms.size;
    stats.totalTrips = Object.values(stats.tripsByRoom).reduce((sum, count) => sum + count, 0);

    return stats;
  }

  /**
   * Render summary statistics as HTML.
   * 
   * @param {Object} stats - Statistics object
   * @returns {string} HTML string
   */
  renderSummaryHTML(stats) {
    let html = '<div class="stats-panel">';
    
    // Total records
    html += `
      <div class="stat-card">
        <div class="stat-label">Total Records</div>
        <div class="stat-value">${stats.totalRecords.toLocaleString()}</div>
      </div>
    `;
    
    // Rooms
    html += `
      <div class="stat-card">
        <div class="stat-label">Rooms</div>
        <div class="stat-value">${stats.roomCount}</div>
      </div>
    `;
    
    // Total breaker trips
    html += `
      <div class="stat-card">
        <div class="stat-label">Total Breaker Trips</div>
        <div class="stat-value" style="color: #ef4444">${stats.totalTrips}</div>
      </div>
    `;
    
    // Max wattage
    html += `
      <div class="stat-card">
        <div class="stat-label">Peak Power</div>
        <div class="stat-value">${stats.maxWattage.toFixed(0)}W</div>
        <div class="stat-label" style="font-size: 0.75rem">${stats.maxWattageRoom}</div>
      </div>
    `;
    
    // Date range
    if (stats.dateRange.start && stats.dateRange.end) {
      const days = Math.ceil((stats.dateRange.end - stats.dateRange.start) / (1000 * 60 * 60 * 24));
      html += `
        <div class="stat-card">
          <div class="stat-label">Time Period</div>
          <div class="stat-value">${days} days</div>
          <div class="stat-label" style="font-size: 0.75rem">
            ${stats.dateRange.start.toLocaleDateString()} - ${stats.dateRange.end.toLocaleDateString()}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    
    // Breaker trips by room
    if (Object.keys(stats.tripsByRoom).length > 0) {
      html += '<div style="margin-top: 1rem"><strong>Breaker Trips by Room:</strong><ul>';
      Object.entries(stats.tripsByRoom).sort((a, b) => b[1] - a[1]).forEach(([room, count]) => {
        html += `<li>${room}: <strong>${count}</strong> trips</li>`;
      });
      html += '</ul></div>';
    }
    
    return html;
  }

  /**
   * Destroy chart instance.
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
