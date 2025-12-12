/**
 * Utility Functions Module
 * 
 * Provides common utility functions for data manipulation and analysis.
 * 
 * @module utils
 */

/**
 * Filter data to weekday records only (Monday-Friday).
 * 
 * @param {Array} data - Array of power reading objects with timestamp field
 * @returns {Array} Filtered array containing only weekday records
 * 
 * @example
 * const weekdayData = filterWeekdayData(allData);
 */
export function filterWeekdayData(data) {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(row => {
    try {
      const date = new Date(row.timestamp);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday through Friday
    } catch (error) {
      console.warn('Invalid timestamp format:', row.timestamp);
      return false;
    }
  });
}

/**
 * Filter data to weekend records only (Saturday-Sunday).
 * 
 * @param {Array} data - Array of power reading objects with timestamp field
 * @returns {Array} Filtered array containing only weekend records
 * 
 * @example
 * const weekendData = filterWeekendData(allData);
 */
export function filterWeekendData(data) {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(row => {
    try {
      const date = new Date(row.timestamp);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday or Sunday
    } catch (error) {
      console.warn('Invalid timestamp format:', row.timestamp);
      return false;
    }
  });
}

/**
 * Format a date object to a human-readable string.
 * 
 * @param {Date|string} date - Date object or ISO string
 * @param {boolean} includeTime - Whether to include time in output
 * @returns {string} Formatted date string
 * 
 * @example
 * formatDate(new Date(), true) // "Dec 12, 2025 3:30 PM"
 * formatDate(new Date(), false) // "Dec 12, 2025"
 */
export function formatDate(date, includeTime = false) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    
    return d.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn('Invalid date format:', date);
    return 'Invalid Date';
  }
}

/**
 * Calculate statistics for a dataset.
 * 
 * @param {Array} data - Array of power reading objects
 * @param {string} field - Field name to calculate statistics for (e.g., 'wattage')
 * @returns {Object} Statistics object with min, max, avg, count
 * 
 * @example
 * const stats = calculateStats(data, 'wattage');
 * // { min: 100, max: 2200, avg: 850.5, count: 10080 }
 */
export function calculateStats(data, field = 'wattage') {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 };
  }

  const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
  
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    count: values.length
  };
}

/**
 * Filter data by time-of-day range (e.g., 3-4pm).
 * 
 * @param {Array} data - Array of power reading objects with timestamp field
 * @param {number} startHour - Starting hour (0-23)
 * @param {number} endHour - Ending hour (0-23)
 * @returns {Array} Filtered array containing only records within time range
 * 
 * @example
 * const afternoonData = filterByTimeOfDay(data, 15, 16); // 3-4pm
 */
export function filterByTimeOfDay(data, startHour, endHour) {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(row => {
    try {
      const date = new Date(row.timestamp);
      const hour = date.getHours();
      return hour >= startHour && hour < endHour;
    } catch (error) {
      console.warn('Invalid timestamp format:', row.timestamp);
      return false;
    }
  });
}

/**
 * Group data by room name.
 * 
 * @param {Array} data - Array of power reading objects
 * @returns {Object} Object with room names as keys and arrays of readings as values
 * 
 * @example
 * const byRoom = groupByRoom(data);
 * // { "Sons room": [...], "Daughters room": [...], ... }
 */
export function groupByRoom(data) {
  if (!data || !Array.isArray(data)) {
    return {};
  }

  return data.reduce((acc, row) => {
    const room = row.room_name || 'Unknown';
    if (!acc[room]) {
      acc[room] = [];
    }
    acc[room].push(row);
    return acc;
  }, {});
}

/**
 * Calculate peak wattage in a specific time window.
 * 
 * @param {Array} data - Array of power reading objects
 * @param {number} startHour - Starting hour (0-23)
 * @param {number} endHour - Ending hour (0-23)
 * @returns {Object} Object with room-level peak statistics
 * 
 * @example
 * const peaks = calculatePeakWattage(data, 15, 16);
 * // { "Sons room": { max: 2150, avg: 1920, count: 42 }, ... }
 */
export function calculatePeakWattage(data, startHour, endHour) {
  const timeFilteredData = filterByTimeOfDay(data, startHour, endHour);
  const grouped = groupByRoom(timeFilteredData);
  
  const result = {};
  
  for (const [room, readings] of Object.entries(grouped)) {
    const stats = calculateStats(readings, 'wattage');
    result[room] = stats;
  }
  
  return result;
}
