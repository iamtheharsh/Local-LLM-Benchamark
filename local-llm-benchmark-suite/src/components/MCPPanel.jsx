import React, { useState } from "react";
import { useTools } from "../context/ToolContext";

function MCPPanel({ onLog }) {
  const { mcpServers, setMcpServers } = useTools();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testingServer, setTestingServer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    authToken: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      authToken: ""
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveServer = () => {
    if (!formData.name || !formData.url) {
      onLog?.("error", "MCP", "Server name and URL are required");
      return;
    }

    const newServer = {
      id: editingId || Date.now(),
      name: formData.name,
      url: formData.url,
      authToken: formData.authToken,
      connected: false,
      latency: null,
      tools: [],
      createdAt: new Date().toLocaleTimeString()
    };

    if (editingId) {
      setMcpServers(prev => prev.map(s => s.id === editingId ? newServer : s));
      onLog?.("info", "MCP", `Server "${formData.name}" updated`);
    } else {
      setMcpServers(prev => [...prev, newServer]);
      onLog?.("info", "MCP", `Server "${formData.name}" saved`);
    }

    resetForm();
  };

  const handleDeleteServer = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the server "${name}"?`)) {
      setMcpServers(prev => prev.filter(s => s.id !== id));
      onLog?.("info", "MCP", `Server "${name}" deleted`);
    }
  };

  const handleConnectServer = async (server) => {
    onLog?.("info", "MCP", `Attempting connection to ${server.url}`);
    setTestingServer(server.id);

    const startTime = Date.now();

    try {
      // Simulate connection attempt
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      const latency = Date.now() - startTime;

      // Simulate server response with tools
      const mockTools = [
        { name: "search", description: "Search the web for information" },
        { name: "translate", description: "Translate text between languages" },
        { name: "summarize", description: "Summarize long documents" },
        { name: "weather", description: "Get current weather data" }
      ].slice(0, Math.floor(Math.random() * 4) + 1);

      setMcpServers(prev => prev.map(s =>
        s.id === server.id
          ? { ...s, connected: true, latency, tools: mockTools }
          : s
      ));

      onLog?.("info", "MCP", `Connection successful (${latency}ms)`);
      onLog?.("debug", "MCP", `${mockTools.length} tools discovered: ${mockTools.map(t => t.name).join(', ')}`);
    } catch (error) {
      setMcpServers(prev => prev.map(s =>
        s.id === server.id
          ? { ...s, connected: false, latency: null }
          : s
      ));

      onLog?.("error", "MCP", `Server "${server.name}" unreachable: ${error.message}`);
    } finally {
      setTestingServer(null);
    }
  };

  const handleDisconnectServer = (server) => {
    setMcpServers(prev => prev.map(s =>
      s.id === server.id
        ? { ...s, connected: false, latency: null }
        : s
    ));

    onLog?.("info", "MCP", `Disconnected from "${server.name}"`);
  };

  const handleTestTool = async (server, tool) => {
    onLog?.("info", "MCP", `Testing tool "${tool.name}" on "${server.name}"...`);

    const startTime = Date.now();

    try {
      // Simulate tool execution
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

      const latency = Date.now() - startTime;

      onLog?.("info", "MCP", `Tool "${tool.name}" test passed (${latency}ms)`);
    } catch (error) {
      onLog?.("error", "MCP", `Tool "${tool.name}" test failed: ${error.message}`);
    }
  };

  const getStatusBadge = (server) => {
    if (testingServer === server.id) {
      return <span className="status-badge testing">⏳ Connecting...</span>;
    }
    return (
      <span className={`status-badge ${server.connected ? 'connected' : 'disconnected'}`}>
        {server.connected ? '🟢 Connected' : '🔴 Disconnected'}
      </span>
    );
  };

  const sortedServers = [...mcpServers].sort((a, b) => {
    if (a.connected && !b.connected) return -1;
    if (!a.connected && b.connected) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mcp-panel">
      <div className="panel-header">
        <h2>MCP Server Management</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="primary-button"
        >
          + New Server
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {isCreating && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) resetForm();
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Server' : 'Add New Server'}</h3>
              <button onClick={resetForm} className="close-button">×</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Server Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ollama Server"
                />
              </div>

              <div className="form-group">
                <label>Base URL *</label>
                <input
                  type="text"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="http://localhost:8080"
                />
              </div>

              <div className="form-group full-width">
                <label>Authentication Token (Optional)</label>
                <input
                  type="password"
                  name="authToken"
                  value={formData.authToken}
                  onChange={handleInputChange}
                  placeholder="Bearer token or API key"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={resetForm} className="secondary-button">Cancel</button>
              <button onClick={handleSaveServer} className="primary-button">
                {editingId ? 'Update Server' : 'Save Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="servers-list">
        {mcpServers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <div className="empty-title">No MCP servers configured</div>
            <div className="empty-description">
              Add your first MCP server to enable agent capabilities
            </div>
          </div>
        ) : (
          sortedServers.map(server => (
            <div key={server.id} className={`server-card ${server.connected ? 'connected' : ''}`}>
              <div className="server-header">
                <div className="server-title">
                  <h3>{server.name}</h3>
                  {getStatusBadge(server)}
                </div>
                <div className="server-actions">
                  {!server.connected ? (
                    <button
                      onClick={() => handleConnectServer(server)}
                      className="connect-button"
                      disabled={testingServer === server.id}
                    >
                      {testingServer === server.id ? '⏳' : '▶️'} Connect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnectServer(server)}
                      className="disconnect-button"
                    >
                      ⏹️ Disconnect
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFormData({
                        name: server.name,
                        url: server.url,
                        authToken: server.authToken
                      });
                      setEditingId(server.id);
                      setIsCreating(true);
                    }}
                    className="edit-button"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteServer(server.id, server.name)}
                    className="delete-button"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="server-details">
                <div className="detail-row">
                  <span className="label">URL:</span>
                  <code className="value">{server.url}</code>
                </div>
                {server.latency && (
                  <div className="detail-row">
                    <span className="label">Latency:</span>
                    <span className="value latency">{server.latency}ms</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Tools:</span>
                  <span className="value">{server.tools.length} exposed</span>
                </div>
                <div className="detail-row">
                  <span className="label">Added:</span>
                  <span className="value">{server.createdAt}</span>
                </div>
              </div>

              {server.connected && server.tools.length > 0 && (
                <div className="tools-section">
                  <div className="tools-header">
                    <h4>Exposed Tools</h4>
                    <span className="tools-count">{server.tools.length}</span>
                  </div>
                  <div className="tools-grid">
                    {server.tools.map((tool, idx) => (
                      <div key={idx} className="tool-item">
                        <div className="tool-info">
                          <div className="tool-name">{tool.name}</div>
                          <div className="tool-description">{tool.description}</div>
                        </div>
                        <button
                          onClick={() => handleTestTool(server, tool)}
                          className="test-button"
                        >
                          🧪 Test
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .mcp-panel {
          height: 100%;
          overflow-y: auto;
          background-color: var(--bg);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
          background-color: var(--surface);
        }

        .panel-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }

        .primary-button {
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

        .primary-button:hover {
          background-color: var(--accent-hover);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.4);
        }

        .secondary-button {
          padding: 8px 16px;
          background-color: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover {
          border-color: var(--accent);
          background-color: var(--surface-hover);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: var(--surface);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid var(--border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text);
        }

        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          color: var(--text-muted);
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background-color: var(--surface-hover);
          color: var(--text);
        }

        .form-grid {
          display: grid;
          gap: 16px;
          padding: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .form-group input {
          padding: 10px 12px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid var(--border);
        }

        .servers-list {
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        .empty-description {
          font-size: 14px;
          color: var(--text-muted);
        }

        .server-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .server-card.connected {
          border-color: #22c55e;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
        }

        .server-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .server-card.connected:hover {
          border-color: #22c55e;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
        }

        .server-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .server-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .server-title h3 {
          margin: 0;
          font-size: 16px;
          color: var(--text);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.connected {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.disconnected {
          background-color: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }

        .status-badge.testing {
          background-color: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .server-actions {
          display: flex;
          gap: 8px;
        }

        .server-actions button {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .connect-button {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .connect-button:hover:not(:disabled) {
          background-color: rgba(34, 197, 94, 0.3);
        }

        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .disconnect-button {
          background-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .disconnect-button:hover {
          background-color: rgba(245, 158, 11, 0.3);
        }

        .edit-button {
          background-color: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .edit-button:hover {
          background-color: rgba(139, 92, 246, 0.3);
        }

        .delete-button {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .delete-button:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }

        .server-details {
          background-color: var(--bg);
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-row .label {
          font-weight: 600;
          color: var(--text-muted);
          min-width: 80px;
        }

        .detail-row .value {
          color: var(--text);
        }

        .detail-row .value.latency {
          color: #22c55e;
          font-weight: 600;
        }

        .detail-row code {
          background-color: var(--surface);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }

        .tools-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .tools-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .tools-header h4 {
          margin: 0;
          font-size: 14px;
          color: var(--text);
        }

        .tools-count {
          padding: 2px 8px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .tools-grid {
          display: grid;
          gap: 8px;
        }

        .tool-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .tool-item:hover {
          border-color: var(--accent);
        }

        .tool-info {
          flex: 1;
        }

        .tool-name {
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
          margin-bottom: 4px;
        }

        .tool-description {
          color: var(--text-muted);
          font-size: 12px;
        }

        .tool-item .test-button {
          padding: 4px 10px;
          background-color: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tool-item .test-button:hover {
          background-color: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}

export default MCPPanel;
