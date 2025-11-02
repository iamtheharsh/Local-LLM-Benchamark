/**
 * BenchmarkManager - Centralized metrics collection and analysis
 *
 * Responsibilities:
 * - Collect performance metrics from all subsystems
 * - Calculate aggregates and statistics
 * - Provide export functionality
 * - Auto-timestamp all entries
 */

class BenchmarkManager {
  constructor() {
    this.metrics = [];
    this.maxEntries = 10000; // Prevent memory bloat
    this.categories = {
      CHAT: 'CHAT',
      RAG: 'RAG',
      TOOLS: 'TOOLS',
      MCP: 'MCP',
      SYSTEM: 'SYSTEM'
    };
  }

  /**
   * Log a metric measurement
   * @param {string} category - Category of metric (CHAT, RAG, TOOLS, MCP, SYSTEM)
   * @param {string} name - Metric name
   * @param {number} value - Numeric value
   * @param {object} metadata - Additional data
   */
  logMetric(category, name, value, metadata = {}) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      category: category.toUpperCase(),
      name: name.toLowerCase(),
      value: parseFloat(value),
      metadata
    };

    this.metrics.push(entry);

    // Auto-prune old entries
    if (this.metrics.length > this.maxEntries) {
      this.metrics.splice(0, this.metrics.length - this.maxEntries);
    }

    return entry;
  }

  /**
   * Get metrics for a specific category
   * @param {string} category - Category to filter
   * @param {number} timeWindow - Time window in milliseconds (default: all time)
   * @returns {Array} Filtered metrics
   */
  getCategoryMetrics(category, timeWindow = null) {
    let filtered = this.metrics.filter(m => m.category === category.toUpperCase());

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      filtered = filtered.filter(m => m.timestamp.getTime() > cutoff);
    }

    return filtered;
  }

  /**
   * Get all metrics
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Array} All metrics or filtered metrics
   */
  getAllMetrics(timeWindow = null) {
    if (!timeWindow) return [...this.metrics];

    const cutoff = Date.now() - timeWindow;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Calculate statistics for a metric name within a category
   * @param {string} category - Category to analyze
   * @param {string} metricName - Name of metric
   * @param {number} timeWindow - Time window in ms
   * @returns {object} Statistics object
   */
  getStatistics(category, metricName, timeWindow = null) {
    const metrics = this.getCategoryMetrics(category, timeWindow)
      .filter(m => m.name === metricName.toLowerCase());

    if (metrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        latest: 0,
        trend: 0
      };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    // Calculate trend (compare first half vs second half)
    let trend = 0;
    if (values.length >= 10) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trend = ((secondAvg - firstAvg) / firstAvg) * 100;
    }

    return {
      count: values.length,
      average: avg,
      min: min,
      max: max,
      latest: latest,
      trend: trend,
      median: this.calculateMedian(values)
    };
  }

  /**
   * Calculate median value
   * @param {Array} values - Array of numbers
   * @returns {number} Median
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Get metrics summary for dashboard
   * @param {number} timeWindow - Time window in ms (default: 5 minutes)
   * @returns {object} Summary object
   */
  getSummary(timeWindow = 5 * 60 * 1000) {
    const summary = {
      chat: {
        latency: this.getStatistics('CHAT', 'latency', timeWindow),
        throughput: this.getStatistics('CHAT', 'tokens_per_second', timeWindow)
      },
      rag: {
        retrievalTime: this.getStatistics('RAG', 'retrieval_time', timeWindow),
        contextSnippets: this.getStatistics('RAG', 'context_snippets', timeWindow)
      },
      tools: {
        executionTime: this.getStatistics('TOOLS', 'execution_time', timeWindow),
        successRate: this.getStatistics('TOOLS', 'success_rate', timeWindow)
      },
      system: {
        cpuUsage: this.getStatistics('SYSTEM', 'cpu_usage', timeWindow),
        memoryUsage: this.getStatistics('SYSTEM', 'memory_usage', timeWindow)
      },
      total: {
        metrics: this.getAllMetrics(timeWindow).length
      }
    };

    return summary;
  }

  /**
   * Export metrics as JSON
   * @param {number} timeWindow - Time window in ms (null for all)
   * @returns {string} JSON string
   */
  exportJSON(timeWindow = null) {
    const data = {
      exportDate: new Date().toISOString(),
      timeWindow: timeWindow,
      totalRecords: this.metrics.length,
      exportedRecords: timeWindow ? this.getAllMetrics(timeWindow).length : this.metrics.length,
      metrics: this.getAllMetrics(timeWindow)
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export metrics as CSV
   * @param {number} timeWindow - Time window in ms (null for all)
   * @returns {string} CSV string
   */
  exportCSV(timeWindow = null) {
    const metrics = this.getAllMetrics(timeWindow);

    if (metrics.length === 0) {
      return 'timestamp,category,name,value\n';
    }

    const headers = 'timestamp,category,name,value\n';
    const rows = metrics.map(m =>
      `${m.timestamp.toISOString()},${m.category},${m.name},${m.value}`
    ).join('\n');

    return headers + rows;
  }

  /**
   * Get time series data for charting
   * @param {string} category - Category to chart
   * @param {string} metricName - Metric name
   * @param {number} timeWindow - Time window in ms
   * @returns {Array} Time series data
   */
  getTimeSeriesData(category, metricName, timeWindow) {
    const metrics = this.getCategoryMetrics(category, timeWindow)
      .filter(m => m.name === metricName.toLowerCase())
      .sort((a, b) => a.timestamp - b.timestamp);

    return metrics.map(m => ({
      time: m.timestamp.getTime(),
      timestamp: m.timestamp.toLocaleTimeString(),
      value: m.value
    }));
  }

  /**
   * Clear all metrics
   * @param {Function} onLog - Logging callback
   */
  clearMetrics(onLog = () => {}) {
    const count = this.metrics.length;
    this.metrics = [];
    onLog('info', 'BENCHMARK', `Metrics cleared (${count} records removed)`);
    return count;
  }

  /**
   * Get storage size info
   * @returns {object} Storage info
   */
  getStorageInfo() {
    const jsonSize = JSON.stringify(this.metrics).length;
    return {
      entryCount: this.metrics.length,
      estimatedSizeBytes: jsonSize,
      estimatedSizeKB: (jsonSize / 1024).toFixed(2),
      maxEntries: this.maxEntries
    };
  }
}

// Export singleton instance
export const benchmarkManager = new BenchmarkManager();
export default benchmarkManager;
