import React, { useEffect, useRef, useState } from "react";

function LogsPanel({ logs, onLogEvent }) {
  const logsEndRef = useRef(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    const levelMatch = levelFilter === "all" || log.level.toLowerCase() === levelFilter.toLowerCase();
    const categoryMatch = categoryFilter === "all" || log.category.toLowerCase() === categoryFilter.toLowerCase();
    const searchMatch = searchTerm === "" ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase());
    return levelMatch && categoryMatch && searchMatch;
  });

  // Clear all logs
  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all logs? This action cannot be undone.")) {
      // We can't directly modify logs from here, so we'll log through the parent
      onLogEvent("info", "SYSTEM", "Logs cleared by user");
      // Note: In a real app, we'd have a clearLogs function passed from parent
      // For now, we'll use a custom event
      window.dispatchEvent(new CustomEvent('clear-logs'));
    }
  };

  // Export logs to JSON file
  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `llm_logs_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    onLogEvent("info", "SYSTEM", `Exported ${filteredLogs.length} logs to JSON file`);
  };

  // Get color for log level
  const getLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'info': return '#3b82f6'; // blue
      case 'debug': return '#8b5cf6'; // purple
      case 'warning': return '#f59e0b'; // amber
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  // Get color for log category
  const getCategoryColor = (category) => {
    const colors = {
      'SYSTEM': '#06b6d4', // cyan
      'CHAT': '#10b981', // emerald
      'RAG': '#f59e0b', // amber
      'TOOLS': '#8b5cf6', // violet
      'MCP': '#ec4899', // pink
      'UI': '#3b82f6', // blue
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h2>Event Logs</h2>
      </div>

      {/* Filter Controls */}
      <div className="logs-filters">
        {/* Level Filter */}
        <div className="filter-group">
          <label>Level:</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="system">System</option>
            <option value="chat">Chat</option>
            <option value="rag">RAG</option>
            <option value="tools">Tools</option>
            <option value="mcp">MCP</option>
            <option value="ui">UI</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="filter-group search-group">
          <input
            type="text"
            className="logs-search"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="filter-actions">
          <button
            onClick={handleExportLogs}
            className="filter-button export-button"
            disabled={filteredLogs.length === 0}
          >
            📤 Export ({filteredLogs.length})
          </button>
          <button
            onClick={handleClearLogs}
            className="filter-button clear-button"
            disabled={logs.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Logs Display */}
      <div className="logs-area">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            {logs.length === 0
              ? "No logs yet..."
              : "No logs match your current filters"}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="log-entry"
              style={{
                animation: 'fadeIn 0.3s ease-in'
              }}
            >
              <span
                className="log-level"
                style={{
                  backgroundColor: getLevelColor(log.level),
                  color: 'white'
                }}
              >
                {log.level.toUpperCase()}
              </span>
              <span
                className="log-category"
                style={{
                  backgroundColor: getCategoryColor(log.category),
                  color: 'white'
                }}
              >
                {log.category}
              </span>
              <span className="log-timestamp">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <style>{`
        .logs-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--bg);
        }

        .logs-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background-color: var(--surface);
        }

        .logs-header h2 {
          margin: 0;
          font-size: 18px;
          color: var(--text);
        }

        .logs-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px 20px;
          background-color: var(--surface);
          border-bottom: 1px solid var(--border);
          align-items: center;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .filter-select {
          padding: 6px 10px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: var(--accent);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
        }

        .search-group {
          flex: 1;
          min-width: 200px;
        }

        .logs-search {
          width: 100%;
          padding: 6px 10px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          transition: all 0.2s;
        }

        .logs-search:hover {
          border-color: var(--accent);
        }

        .logs-search:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
        }

        .filter-actions {
          display: flex;
          gap: 8px;
        }

        .filter-button {
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background-color: var(--surface);
          color: var(--text);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-button:hover:not(:disabled) {
          background-color: var(--surface-hover);
          border-color: var(--accent);
        }

        .filter-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-button {
          border-color: var(--accent);
        }

        .clear-button {
          border-color: var(--error);
          color: var(--error);
        }

        .clear-button:hover:not(:disabled) {
          background-color: rgba(239, 68, 68, 0.1);
        }

        .logs-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background-color: var(--bg);
        }

        .no-logs {
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
          padding: 40px 20px;
        }

        .log-entry {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          margin-bottom: 8px;
          background-color: var(--surface);
          border-radius: 6px;
          border: 1px solid var(--border);
          transition: all 0.2s;
          font-size: 13px;
          line-height: 1.5;
        }

        .log-entry:hover {
          border-color: var(--border-light);
          background-color: var(--surface-hover);
        }

        .log-level {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .log-category {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .log-timestamp {
          color: var(--text-muted);
          font-size: 11px;
          flex-shrink: 0;
        }

        .log-message {
          color: var(--text);
          flex: 1;
          word-break: break-word;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default LogsPanel;
