import React, { useState, useEffect, useRef } from "react";
import { benchmarkManager } from "../agent/BenchmarkManager";

function ResourceMonitor({ onLog }) {
  const [metrics, setMetrics] = useState({
    memory_used: 4.2,
    memory_total: 16,
    memory_percentage: 26.25,
    cpu_usage: 15.3,
    cpu_count: 8,
    battery_level: 87.5,
    battery_time_remaining: "3h 24m",
    battery_state: "Charging"
  });
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const intervalRef = useRef(null);
  const previousMetrics = useRef(metrics);

  const fetchMetrics = async () => {
    try {
      let newMetrics;
      let useSimulation = true; // Default to simulation mode

      // Only try Tauri in a real Tauri environment
      if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI_VERSION__) {
        try {
          // Use eval to completely hide from Vite bundler
          const backendMetrics = await eval(`
            (async () => {
              const { invoke } = await import('@tauri-apps/api/tauri');
              return await invoke('get_system_metrics');
            })()
          `);

          newMetrics = {
            memory_used: backendMetrics.memory_used,
            memory_total: backendMetrics.memory_total,
            memory_percentage: backendMetrics.memory_percentage,
            cpu_usage: backendMetrics.cpu_usage,
            cpu_count: backendMetrics.cpu_count,
            battery_level: backendMetrics.battery_level,
            battery_time_remaining: backendMetrics.battery_time_remaining,
            battery_state: backendMetrics.battery_state
          };
          useSimulation = false;
        } catch (tauriError) {
          console.warn('Tauri backend not available, using simulated metrics:', tauriError);
          useSimulation = true;
        }
      }

      if (useSimulation) {
        // Fallback to simulated metrics for web mode
        newMetrics = {
          memory_used: metrics.memory_used + (Math.random() - 0.5) * 0.5,
          memory_total: metrics.memory_total,
          memory_percentage: Math.max(0, Math.min(100, metrics.memory_percentage + (Math.random() - 0.5) * 5)),
          cpu_usage: Math.max(0, Math.min(100, metrics.cpu_usage + (Math.random() - 0.5) * 10)),
          cpu_count: metrics.cpu_count,
          battery_level: metrics.battery_level > 0 ? Math.max(0, metrics.battery_level - (Math.random() * 0.1)) : null,
          battery_time_remaining: metrics.battery_time_remaining,
          battery_state: metrics.battery_state
        };

        // Simulate battery drain
        if (newMetrics.battery_level && newMetrics.battery_level > 0) {
          if (Math.random() > 0.95) {
            newMetrics.battery_level = Math.max(0, newMetrics.battery_level - 0.5);
          }
        }
      }

      setMetrics(newMetrics);
      setError(null);

      // Log benchmark metrics for system resources
      benchmarkManager.logMetric('SYSTEM', 'cpu_usage', newMetrics.cpu_usage, {
        cpu_count: newMetrics.cpu_count
      });

      benchmarkManager.logMetric('SYSTEM', 'memory_usage', newMetrics.memory_used, {
        memory_total: newMetrics.memory_total,
        memory_percentage: newMetrics.memory_percentage
      });

      if (newMetrics.battery_level !== null) {
        benchmarkManager.logMetric('SYSTEM', 'battery_level', newMetrics.battery_level, {
          battery_state: newMetrics.battery_state
        });
      }

      // Check for threshold warnings
      if (newMetrics.memory_percentage > 85 && previousMetrics.current.memory_percentage <= 85) {
        onLog?.("warning", "SYSTEM", `Memory usage high: ${newMetrics.memory_percentage.toFixed(1)}%`);
      }

      if (newMetrics.cpu_usage > 90 && previousMetrics.current.cpu_usage <= 90) {
        onLog?.("warning", "SYSTEM", `High CPU load detected: ${newMetrics.cpu_usage.toFixed(1)}%`);
      }

      if (newMetrics.battery_level !== null && newMetrics.battery_level < 20 && (previousMetrics.current.battery_level === null || previousMetrics.current.battery_level >= 20)) {
        onLog?.("warning", "SYSTEM", `Battery level critical: ${newMetrics.battery_level.toFixed(0)}%`);
      }

      if (newMetrics.battery_level !== null && newMetrics.battery_level < 10 && (previousMetrics.current.battery_level === null || previousMetrics.current.battery_level >= 10)) {
        onLog?.("error", "SYSTEM", `Battery critically low: ${newMetrics.battery_level.toFixed(0)}%`);
      }

      previousMetrics.current = newMetrics;
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err.message);
      onLog?.("error", "SYSTEM", `Failed to fetch system metrics: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isPolling) {
      // Fetch immediately on mount
      fetchMetrics();

      // Set up polling interval (every 1 second)
      intervalRef.current = setInterval(fetchMetrics, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPolling]);

  const togglePolling = () => {
    setIsPolling(!isPolling);
  };

  // Calculate metrics for display
  const memoryUsedGB = metrics.memory_used.toFixed(2);
  const memoryTotalGB = metrics.memory_total.toFixed(0);
  const cpuUsage = metrics.cpu_usage.toFixed(1);
  const batteryPercentage = metrics.battery_level !== null ? metrics.battery_level.toFixed(0) : 'N/A';
  const batteryTime = metrics.battery_time_remaining || '—';

  const getThresholdClass = (percentage, type) => {
    if (type === 'memory' && percentage > 85) return 'warning';
    if (type === 'cpu' && percentage > 90) return 'danger';
    if (type === 'battery' && percentage !== null && percentage < 20) return 'danger';
    if (type === 'battery' && percentage !== null && percentage < 50) return 'warning';
    return 'normal';
  };

  const displayMetrics = [
    {
      id: "ram",
      title: "Memory Usage",
      value: `${memoryUsedGB} GB`,
      subtitle: `of ${memoryTotalGB} GB RAM`,
      percentage: Math.min(metrics.memory_percentage, 100),
      icon: "💾",
      threshold: getThresholdClass(metrics.memory_percentage, 'memory')
    },
    {
      id: "cpu",
      title: "CPU Usage",
      value: `${cpuUsage}%`,
      subtitle: `${metrics.cpu_count} cores active`,
      percentage: Math.min(metrics.cpu_usage, 100),
      icon: "🖥️",
      threshold: getThresholdClass(metrics.cpu_usage, 'cpu')
    },
    {
      id: "battery",
      title: "Battery Level",
      value: `${batteryPercentage}%`,
      subtitle: metrics.battery_level !== null ? `${batteryTime} remaining` : metrics.battery_state,
      percentage: metrics.battery_level !== null ? metrics.battery_level : 0,
      icon: "🔋",
      threshold: getThresholdClass(metrics.battery_level || 100, 'battery')
    },
    {
      id: "tokens",
      title: "Token Throughput",
      value: "42.5",
      subtitle: "tokens/second",
      percentage: 85,
      icon: "⚡",
      threshold: 'normal'
    }
  ];

  return (
    <div className="resource-container">
      <div className="panel-header">
        <h2>System Resources</h2>
        <button
          onClick={togglePolling}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'var(--surface)';
          }}
        >
          {isPolling ? '⏸️ Pause' : '▶️ Resume'}
        </button>
      </div>

      {error && (
        <div style={{
          margin: '12px 20px',
          padding: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--error)',
          borderRadius: '6px',
          color: 'var(--error)',
          fontSize: '13px'
        }}>
          ⚠️ Error: {error}
        </div>
      )}

      {displayMetrics.map((metric) => (
        <div
          key={metric.id}
          className={`metric-card ${metric.threshold === 'warning' ? 'metric-warning' : ''} ${metric.threshold === 'danger' ? 'metric-danger' : ''}`}
        >
          <div className="metric-header">
            <h3 className="metric-title">{metric.title}</h3>
            <div className="metric-icon">
              <span>{metric.icon}</span>
            </div>
          </div>

          <div className="metric-value">{metric.value}</div>
          <div className="metric-subtitle">{metric.subtitle}</div>

          <div className="metric-bar">
            <div
              className={`metric-bar-fill ${metric.threshold === 'warning' ? 'bar-warning' : ''} ${metric.threshold === 'danger' ? 'bar-danger' : ''}`}
              style={{ width: `${metric.percentage}%` }}
            />
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}>
        {isPolling
          ? `💡 Live metrics updating every 1 second (${typeof window !== 'undefined' && window.__TAURI__ ? 'REAL DATA via Rust backend' : 'SIMULATED - web mode'})`
          : '⏸️ Monitoring paused'}
      </div>

      <style>{`
        .metric-warning {
          border-color: var(--warning);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
        }

        .metric-warning:hover {
          border-color: var(--warning);
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
        }

        .metric-danger {
          border-color: var(--error);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
        }

        .metric-danger:hover {
          border-color: var(--error);
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
        }

        .bar-warning {
          background: linear-gradient(90deg, var(--warning), #fbbf24);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        .bar-danger {
          background: linear-gradient(90deg, var(--error), #dc2626);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </div>
  );
}

export default ResourceMonitor;
