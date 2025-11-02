import React, { useState, useEffect } from "react";
import { benchmarkManager } from "../agent/BenchmarkManager";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

function BenchmarkDashboard({ onLog }) {
  const [summary, setSummary] = useState(null);
  const [timeWindow, setTimeWindow] = useState(5 * 60 * 1000); // 5 minutes
  const [latencyData, setLatencyData] = useState([]);
  const [throughputData, setThroughputData] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);

  const TIME_WINDOW_OPTIONS = [
    { label: "Last 5 minutes", value: 5 * 60 * 1000 },
    { label: "Last 30 minutes", value: 30 * 60 * 1000 },
    { label: "Last 1 hour", value: 60 * 60 * 1000 },
    { label: "Last 24 hours", value: 24 * 60 * 60 * 1000 }
  ];

  // Update metrics periodically
  useEffect(() => {
    updateMetrics();

    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [timeWindow]);

  const updateMetrics = () => {
    const newSummary = benchmarkManager.getSummary(timeWindow);
    setSummary(newSummary);

    // Get time series data for charts
    const latency = benchmarkManager.getTimeSeriesData('CHAT', 'latency', timeWindow);
    const throughput = benchmarkManager.getTimeSeriesData('CHAT', 'tokens_per_second', timeWindow);
    const systemCpu = benchmarkManager.getTimeSeriesData('SYSTEM', 'cpu_usage', timeWindow);

    // Combine latency and CPU data for correlation chart
    const combinedData = latency.map((lat, idx) => ({
      timestamp: lat.timestamp,
      latency: lat.value,
      cpu: systemCpu[idx]?.value || 0
    }));

    setLatencyData(combinedData);
    setThroughputData(throughput);

    setStorageInfo(benchmarkManager.getStorageInfo());
  };

  const handleExportJSON = () => {
    try {
      const jsonData = benchmarkManager.exportJSON(timeWindow);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark_metrics_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      onLog?.("info", "BENCHMARK", `Metrics exported as JSON (${storageInfo?.entryCount} records)`);
    } catch (error) {
      onLog?.("error", "BENCHMARK", `Export failed: ${error.message}`);
    }
  };

  const handleExportCSV = () => {
    try {
      const csvData = benchmarkManager.exportCSV(timeWindow);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark_metrics_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      onLog?.("info", "BENCHMARK", `Metrics exported as CSV (${storageInfo?.entryCount} records)`);
    } catch (error) {
      onLog?.("error", "BENCHMARK", `Export failed: ${error.message}`);
    }
  };

  const handleClearMetrics = () => {
    if (window.confirm('Are you sure you want to clear all benchmark metrics? This action cannot be undone.')) {
      const count = benchmarkManager.clearMetrics(onLog);
      updateMetrics();
      onLog?.("info", "BENCHMARK", `Cleared ${count} metric records`);
    }
  };

  const formatTrend = (trend) => {
    const symbol = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
    const color = trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--error)' : 'var(--text-muted)';
    return { symbol, color };
  };

  if (!summary) {
    return <div>Loading benchmark data...</div>;
  }

  const StatCard = ({ title, icon, value, unit, trend, warning = false }) => {
    const trendInfo = formatTrend(trend);
    return (
      <div className={`stat-card ${warning ? 'warning' : ''}`}>
        <div className="stat-card-header">
          <span className="stat-icon">{icon}</span>
          <span className="stat-title">{title}</span>
        </div>
        <div className="stat-card-value">
          {typeof value === 'number' ? value.toFixed(2) : value}{unit && <span className="stat-unit">{unit}</span>}
          {trend !== 0 && (
            <span className="stat-trend" style={{ color: trendInfo.color }}>
              {trendInfo.symbol} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="benchmark-container">
      <div className="panel-header">
        <h2>📊 Benchmark Dashboard</h2>
        <div className="header-controls">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="time-window-select"
          >
            {TIME_WINDOW_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <StatCard
          title="Avg Latency"
          icon="🧠"
          value={summary.chat.latency.average || 0}
          unit="s"
          trend={summary.chat.latency.trend}
          warning={(summary.chat.latency.average || 0) > 2.0}
        />
        <StatCard
          title="Token Throughput"
          icon="⚡"
          value={summary.chat.throughput.average || 0}
          unit=" tok/s"
          trend={summary.chat.throughput.trend}
        />
        <StatCard
          title="RAG Speed"
          icon="🔍"
          value={summary.rag.retrievalTime.average || 0}
          unit="s"
          trend={summary.rag.retrievalTime.trend}
          warning={(summary.rag.retrievalTime.average || 0) > 0.5}
        />
        <StatCard
          title="Tool Success"
          icon="🧩"
          value={summary.tools.successRate.average || 0}
          unit="%"
          trend={summary.tools.successRate.trend}
          warning={(summary.tools.successRate.average || 0) < 95}
        />
        <StatCard
          title="CPU Peak"
          icon="💻"
          value={summary.system.cpuUsage.max || 0}
          unit="%"
          trend={summary.system.cpuUsage.trend}
          warning={(summary.system.cpuUsage.max || 0) > 80}
        />
        <StatCard
          title="Memory Usage"
          icon="💾"
          value={summary.system.memoryUsage.average || 0}
          unit=" GB"
          trend={summary.system.memoryUsage.trend}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Latency vs CPU Usage</h3>
            <span className="chart-subtitle">Response time correlation</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="timestamp" stroke="var(--text-muted)" />
              <YAxis yAxisId="left" stroke="var(--accent)" label={{ value: 'Latency (s)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--warning)" label={{ value: 'CPU (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="latency" stroke="var(--accent)" strokeWidth={2} name="Latency (s)" />
              <Line yAxisId="right" type="monotone" dataKey="cpu" stroke="var(--warning)" strokeWidth={2} name="CPU (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Token Throughput</h3>
            <span className="chart-subtitle">Tokens processed per second</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="timestamp" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text)" label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--success)" fill="var(--success)" fillOpacity={0.3} name="Tokens/sec" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-panel">
        <div className="storage-info">
          <span className="storage-stat">
            📦 {storageInfo?.entryCount || 0} metrics ({storageInfo?.estimatedSizeKB || 0} KB)
          </span>
        </div>
        <div className="action-buttons">
          <button onClick={handleExportJSON} className="export-button">
            📥 Export JSON
          </button>
          <button onClick={handleExportCSV} className="export-button">
            📊 Export CSV
          </button>
          <button onClick={handleClearMetrics} className="clear-button">
            🗑️ Clear All
          </button>
        </div>
      </div>

      <style>{`
        .benchmark-container {
          height: 100%;
          overflow-y: auto;
          background-color: var(--bg);
          padding: 20px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 22px;
          color: var(--text);
        }

        .header-controls {
          display: flex;
          gap: 12px;
        }

        .time-window-select {
          padding: 8px 12px;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
        }

        .time-window-select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s;
        }

        .stat-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .stat-card.warning {
          border-color: var(--warning);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .stat-icon {
          font-size: 20px;
        }

        .stat-title {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-card-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .stat-unit {
          font-size: 14px;
          color: var(--text-muted);
        }

        .stat-trend {
          font-size: 12px;
          font-weight: 600;
        }

        .charts-grid {
          display: grid;
          gap: 20px;
          margin-bottom: 24px;
        }

        .chart-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
        }

        .chart-header {
          margin-bottom: 16px;
        }

        .chart-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: var(--text);
        }

        .chart-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .actions-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 20px;
        }

        .storage-info {
          font-size: 13px;
          color: var(--text-muted);
        }

        .storage-stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .export-button, .clear-button {
          padding: 8px 16px;
          background-color: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-button:hover {
          background-color: var(--accent-hover);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.4);
        }

        .clear-button {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .clear-button:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}

export default BenchmarkDashboard;
