import React, { useState, useEffect } from "react";
import { useTools } from "../context/ToolContext";

function ToolsPanel({ onLog }) {
  const { toolsPanelTools, addTool, updateTool, removeTool } = useTools();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    endpoint: "",
    method: "GET",
    timeout: 5000,
    variablesSchema: "{}",
    headers: "{}"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      endpoint: "",
      method: "GET",
      timeout: 5000,
      variablesSchema: "{}",
      headers: "{}"
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "timeout" ? parseInt(value) || 0 : value
    }));
  };

  const handleSaveTool = () => {
    if (!formData.name || !formData.endpoint) {
      onLog?.("error", "TOOLS", "Tool name and endpoint are required");
      return;
    }

    try {
      // Validate JSON fields
      JSON.parse(formData.variablesSchema);
      JSON.parse(formData.headers);
    } catch (error) {
      onLog?.("error", "TOOLS", `Invalid JSON: ${error.message}`);
      return;
    }

    const toolData = {
      id: editingId || Date.now(),
      ...formData,
      active: true,
      createdAt: new Date().toLocaleTimeString()
    };

    if (editingId) {
      updateTool(editingId, toolData);
      onLog?.("info", "TOOLS", `Tool "${formData.name}" updated`);
    } else {
      addTool(toolData);
      onLog?.("info", "TOOLS", `Tool "${formData.name}" saved`);
    }

    resetForm();
  };

  const handleDeleteTool = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the tool "${name}"?`)) {
      removeTool(id);
      onLog?.("info", "TOOLS", `Tool "${name}" deleted`);
    }
  };

  const handleToggleActive = (id) => {
    const tool = toolsPanelTools.find(t => t.id === id);
    onLog?.("info", "TOOLS", `Tool "${tool?.name}" ${!tool?.active ? 'activated' : 'deactivated'}`);
  };

  const handleEditTool = (tool) => {
    setFormData({
      name: tool.name,
      description: tool.description,
      endpoint: tool.endpoint,
      method: tool.method,
      timeout: tool.timeout,
      variablesSchema: tool.variablesSchema,
      headers: tool.headers
    });
    setEditingId(tool.id);
    setIsCreating(true);
    onLog?.("debug", "TOOLS", `Editing tool "${tool.name}"`);
  };

  const handleTestTool = async (tool) => {
    onLog?.("info", "TOOLS", `Testing tool "${tool.name}"...`);
    setTestResult(null);
    setShowTestModal(true);

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), tool.timeout);

    try {
      let fetchOptions = {
        method: tool.method,
        headers: JSON.parse(tool.headers || "{}"),
        signal: controller.signal
      };

      if (tool.method !== "GET" && tool.method !== "DELETE") {
        fetchOptions.body = JSON.stringify(JSON.parse(tool.variablesSchema || "{}"));
      }

      const response = await fetch(tool.endpoint, fetchOptions);
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const responseData = isJson ? await response.json() : await response.text();

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        elapsed,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        size: JSON.stringify(responseData).length
      };

      setTestResult(result);

      if (response.ok) {
        onLog?.("info", "TOOLS", `Tool "${tool.name}" executed successfully (${elapsed} ms)`);
        onLog?.("debug", "TOOLS", `Response size: ${(result.size / 1024).toFixed(2)} KB`);
      } else {
        onLog?.("error", "TOOLS", `Tool "${tool.name}" failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (error.name === "AbortError") {
        onLog?.("error", "TOOLS", `Tool "${tool.name}" timeout after ${tool.timeout} ms`);
        setTestResult({
          success: false,
          error: "Request timeout",
          elapsed: tool.timeout
        });
      } else {
        onLog?.("error", "TOOLS", `Tool "${tool.name}" error: ${error.message}`);
        setTestResult({
          success: false,
          error: error.message,
          elapsed
        });
      }
    }
  };

  return (
    <div className="tools-panel">
      <div className="panel-header">
        <h2>Tools Management</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="primary-button"
        >
          + New Tool
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {isCreating && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) resetForm();
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Tool' : 'Create New Tool'}</h3>
              <button onClick={resetForm} className="close-button">×</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Tool Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="WeatherAPI"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Get current weather for a location"
                  rows={2}
                />
              </div>

              <div className="form-group full-width">
                <label>Endpoint URL *</label>
                <input
                  type="text"
                  name="endpoint"
                  value={formData.endpoint}
                  onChange={handleInputChange}
                  placeholder="https://api.weather.com/v1/current"
                />
              </div>

              <div className="form-group">
                <label>Method</label>
                <select name="method" value={formData.method} onChange={handleInputChange}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="form-group">
                <label>Timeout (ms)</label>
                <input
                  type="number"
                  name="timeout"
                  value={formData.timeout}
                  onChange={handleInputChange}
                  min="100"
                  step="100"
                />
              </div>

              <div className="form-group full-width">
                <label>Variables Schema (JSON)</label>
                <textarea
                  name="variablesSchema"
                  value={formData.variablesSchema}
                  onChange={handleInputChange}
                  placeholder='{"city": "London", "units": "metric"}'
                  rows={4}
                />
              </div>

              <div className="form-group full-width">
                <label>Headers (JSON) - Optional</label>
                <textarea
                  name="headers"
                  value={formData.headers}
                  onChange={handleInputChange}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={resetForm} className="secondary-button">Cancel</button>
              <button onClick={handleSaveTool} className="primary-button">
                {editingId ? 'Update Tool' : 'Save Tool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {showTestModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowTestModal(false);
        }}>
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Test Result</h3>
              <button onClick={() => setShowTestModal(false)} className="close-button">×</button>
            </div>

            {testResult ? (
              <div className="test-result">
                <div className={`status-badge ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? '✓ SUCCESS' : '✗ FAILED'}
                </div>

                <div className="result-grid">
                  {testResult.status && (
                    <div className="result-item">
                      <span className="label">Status:</span>
                      <span className={`value ${testResult.success ? 'success' : 'error'}`}>
                        {testResult.status} {testResult.statusText}
                      </span>
                    </div>
                  )}
                  {testResult.elapsed && (
                    <div className="result-item">
                      <span className="label">Latency:</span>
                      <span className="value">{testResult.elapsed} ms</span>
                    </div>
                  )}
                  {testResult.size && (
                    <div className="result-item">
                      <span className="label">Response Size:</span>
                      <span className="value">{(testResult.size / 1024).toFixed(2)} KB</span>
                    </div>
                  )}
                  {testResult.error && (
                    <div className="result-item">
                      <span className="label">Error:</span>
                      <span className="value error">{testResult.error}</span>
                    </div>
                  )}
                </div>

                {testResult.data && (
                  <div className="result-section">
                    <div className="section-label">Response Data:</div>
                    <pre className="code-block">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="loading">Running test...</div>
            )}

            <div className="modal-footer">
              <button onClick={() => setShowTestModal(false)} className="primary-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools List */}
      <div className="tools-list">
        {toolsPanelTools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <div className="empty-title">No tools defined</div>
            <div className="empty-description">
              Create your first tool to enable LLM agent actions
            </div>
          </div>
        ) : (
          toolsPanelTools.map(tool => (
            <div key={tool.id} className="tool-card">
              <div className="tool-header">
                <div className="tool-title">
                  <h3>{tool.name}</h3>
                  <span className={`status-badge ${tool.active ? 'active' : 'disabled'}`}>
                    {tool.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="method-badge">{tool.method}</div>
              </div>

              <div className="tool-description">
                {tool.description || 'No description'}
              </div>

              <div className="tool-endpoint">
                <code>{tool.endpoint}</code>
              </div>

              <div className="tool-meta">
                <span>Timeout: {tool.timeout}ms</span>
                <span>Created: {tool.createdAt}</span>
              </div>

              <div className="tool-actions">
                <button
                  onClick={() => handleTestTool(tool)}
                  className="test-button"
                >
                  🧪 Test
                </button>
                <button
                  onClick={() => handleEditTool(tool)}
                  className="edit-button"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleToggleActive(tool.id)}
                  className={`toggle-button ${tool.active ? 'active' : ''}`}
                >
                  {tool.active ? '⏸️ Disable' : '▶️ Enable'}
                </button>
                <button
                  onClick={() => handleDeleteTool(tool.id, tool.name)}
                  className="delete-button"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .tools-panel {
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
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid var(--border);
        }

        .modal-content.large {
          max-width: 900px;
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
          grid-template-columns: 1fr 1fr;
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

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
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

        .tools-list {
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

        .tool-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .tool-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .tool-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tool-title h3 {
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

        .status-badge.active {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.disabled {
          background-color: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }

        .status-badge.success {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.error {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .method-badge {
          padding: 4px 10px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
        }

        .tool-description {
          color: var(--text-muted);
          font-size: 13px;
          margin-bottom: 12px;
        }

        .tool-endpoint {
          background-color: var(--bg);
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          overflow-x: auto;
        }

        .tool-endpoint code {
          font-size: 12px;
          color: var(--text-muted);
        }

        .tool-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .tool-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tool-actions button {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .test-button {
          background-color: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .test-button:hover {
          background-color: rgba(59, 130, 246, 0.3);
        }

        .edit-button {
          background-color: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .edit-button:hover {
          background-color: rgba(139, 92, 246, 0.3);
        }

        .toggle-button {
          background-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .toggle-button:hover {
          background-color: rgba(245, 158, 11, 0.3);
        }

        .toggle-button.active {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .delete-button {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .delete-button:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }

        .test-result {
          padding: 20px;
        }

        .result-grid {
          display: grid;
          gap: 12px;
          margin: 16px 0;
        }

        .result-item {
          display: flex;
          gap: 12px;
        }

        .result-item .label {
          font-weight: 600;
          color: var(--text-muted);
          min-width: 120px;
        }

        .result-item .value {
          color: var(--text);
        }

        .result-item .value.success {
          color: #22c55e;
        }

        .result-item .value.error {
          color: #ef4444;
        }

        .result-section {
          margin-top: 20px;
        }

        .section-label {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        .code-block {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          font-size: 12px;
          color: var(--text-muted);
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ToolsPanel;
