/**
 * Event Bus for decoupled module communication.
 * 
 * Implements publish-subscribe pattern per research.md architecture.
 * Enables independent testing and flexible module composition.
 * 
 * @module core/eventBus
 */

/**
 * Central event bus for application-wide communication.
 * 
 * Modules emit events when state changes or actions complete.
 * Other modules subscribe to events they're interested in.
 * 
 * @class EventBus
 */
export class EventBus {
  constructor() {
    /**
     * Map of event names to arrays of listener callbacks.
     * @type {Map<string, Function[]>}
     */
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * 
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   * 
   * @example
   * const unsubscribe = eventBus.on('data:loaded', (data) => {
   *   console.log('Data loaded:', data.length, 'records');
   * });
   * // Later: unsubscribe();
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event.
   * 
   * @param {string} event - Event name to stop listening to
   * @param {Function} callback - Callback function to remove
   * 
   * @example
   * eventBus.off('data:loaded', myHandler);
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    
    // Clean up empty listener arrays
    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional data.
   * 
   * All subscribers will be called synchronously in registration order.
   * 
   * @param {string} event - Event name to emit
   * @param {*} data - Data to pass to listeners
   * 
   * @example
   * eventBus.emit('data:loaded', { records: csvData, count: 10080 });
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    
    // Call each listener with the event data
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
  }

  /**
   * Subscribe to an event that fires only once.
   * 
   * Listener will automatically unsubscribe after first invocation.
   * 
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   * 
   * @example
   * eventBus.once('data:loaded', (data) => {
   *   console.log('First data load complete');
   * });
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    
    return this.on(event, wrapper);
  }

  /**
   * Get count of listeners for an event.
   * 
   * Useful for debugging and testing.
   * 
   * @param {string} event - Event name to check
   * @returns {number} Number of registered listeners
   */
  listenerCount(event) {
    if (!this.listeners.has(event)) {
      return 0;
    }
    
    return this.listeners.get(event).length;
  }

  /**
   * Remove all listeners for an event, or all listeners for all events.
   * 
   * @param {string} [event] - Optional event name to clear. If omitted, clears all.
   * 
   * @example
   * eventBus.clear('data:loaded'); // Clear specific event
   * eventBus.clear();              // Clear all events
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance for application use
export const eventBus = new EventBus();

/**
 * Standard event names used in the application.
 * 
 * Centralizing event names prevents typos and aids discoverability.
 */
export const EVENTS = {
  // Data loading events
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error',
  DATA_VALIDATED: 'data:validated',
  
  // Chart events
  CHART_RENDERED: 'chart:rendered',
  CHART_UPDATED: 'chart:updated',
  CHART_ERROR: 'chart:error',
  
  // Filter events
  FILTERS_APPLIED: 'filters:applied',
  FILTERS_CLEARED: 'filters:cleared',
  
  // Comparison events
  COMPARISON_ENABLED: 'comparison:enabled',
  COMPARISON_DISABLED: 'comparison:disabled',
  
  // Export events
  EXPORT_STARTED: 'export:started',
  EXPORT_COMPLETED: 'export:completed',
  EXPORT_FAILED: 'export:failed',
  
  // UI events
  FILE_SELECTED: 'file:selected',
  VIEW_CHANGED: 'view:changed'
};
