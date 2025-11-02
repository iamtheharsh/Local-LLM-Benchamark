import React, { useState } from "react";
import { useMemory } from "../context/MemoryContext";

function RAGPanel({ onLog }) {
  const { documents, stats, addDocument, deleteDocument, clearMemory, reembedAll } = useMemory();

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      content: ""
    });
    setIsAdding(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDocument = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      onLog?.("error", "RAG", "Document name and content are required");
      return;
    }

    onLog?.("info", "RAG", `Adding document "${formData.name}"`);

    try {
      const docInfo = addDocument(formData.name.trim(), formData.content.trim(), onLog);

      onLog?.("info", "RAG", `Document "${formData.name}" added successfully`, {
        docId: docInfo.id,
        size: docInfo.size,
        chunkCount: docInfo.chunkCount
      });

      resetForm();
    } catch (error) {
      onLog?.("error", "RAG", `Failed to add document: ${error.message}`);
    }
  };

  const handleDeleteDocument = (docId, docName) => {
    if (window.confirm(`Are you sure you want to delete the document "${docName}"?`)) {
      deleteDocument(docId, onLog);
    }
  };

  const handleClearMemory = () => {
    if (window.confirm('Are you sure you want to clear all memory? This action cannot be undone.')) {
      clearMemory(onLog);
    }
  };

  const handleReembedAll = () => {
    onLog?.("info", "RAG", "Starting re-embedding process...");
    const result = reembedAll(onLog);
    onLog?.("info", "RAG", `Re-embedding completed`, result);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="rag-panel">
      <div className="panel-header">
        <h2>RAG Memory Management</h2>
        <div className="header-stats">
          <span className="stat-badge">
            {stats.documents} documents
          </span>
          <span className="stat-badge">
            {stats.chunks} chunks
          </span>
          <span className="stat-badge">
            {stats.sizeKB} KB
          </span>
        </div>
      </div>

      <div className="panel-actions">
        <button
          onClick={() => setIsAdding(true)}
          className="primary-button"
        >
          + Add Document
        </button>
        <button
          onClick={handleReembedAll}
          className="secondary-button"
          disabled={stats.documents === 0}
        >
          🔄 Re-embed All
        </button>
        <button
          onClick={handleClearMemory}
          className="danger-button"
          disabled={stats.documents === 0}
        >
          🗑️ Clear Memory
        </button>
      </div>

      {/* Add Document Modal */}
      {isAdding && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) resetForm();
        }}>
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Add New Document</h3>
              <button onClick={resetForm} className="close-button">×</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Document Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Project Notes, Research Paper"
                />
              </div>

              <div className="form-group full-width">
                <label>Document Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Paste or type your document content here..."
                  rows={15}
                />
                <div className="char-count">
                  {formData.content.length} characters
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={resetForm} className="secondary-button">Cancel</button>
              <button onClick={handleAddDocument} className="primary-button">
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="documents-list">
        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No documents in memory</div>
            <div className="empty-description">
              Add documents to enable RAG-powered contextual responses
            </div>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="document-header">
                <div className="document-title">
                  <h3>{doc.name}</h3>
                  <span className="document-meta">
                    {doc.chunkCount} chunks • {(doc.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <div className="document-actions">
                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    className="delete-button"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className="document-details">
                <div className="detail-row">
                  <span className="label">Added:</span>
                  <span className="value">{formatDate(doc.addedAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Preview:</span>
                  <span className="value preview">
                    {doc.text.substring(0, 200)}
                    {doc.text.length > 200 ? '...' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rag-info">
        <h3>About RAG</h3>
        <p>
          Retrieval-Augmented Generation (RAG) allows the AI to access and use information
          from your uploaded documents when answering questions. This provides:
        </p>
        <ul>
          <li><strong>Contextual Awareness:</strong> AI can reference your specific documents</li>
          <li><strong>Up-to-date Information:</strong> Use your latest notes and research</li>
          <li><strong>Improved Accuracy:</strong> Ground responses in source materials</li>
        </ul>
      </div>

      <style>{`
        .rag-panel {
          height: 100%;
          overflow-y: auto;
          background-color: var(--bg);
          display: flex;
          flex-direction: column;
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

        .header-stats {
          display: flex;
          gap: 8px;
        }

        .stat-badge {
          padding: 6px 12px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .panel-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background-color: var(--surface);
          flex-wrap: wrap;
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

        .secondary-button:hover:not(:disabled) {
          border-color: var(--accent);
          background-color: var(--surface-hover);
        }

        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .danger-button {
          padding: 8px 16px;
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .danger-button:hover:not(:disabled) {
          background-color: rgba(239, 68, 68, 0.3);
        }

        .danger-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .form-group textarea {
          padding: 10px 12px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
        }

        .char-count {
          font-size: 12px;
          color: var(--text-muted);
          text-align: right;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid var(--border);
        }

        .documents-list {
          padding: 20px;
          display: grid;
          gap: 16px;
          flex: 1;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
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

        .document-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .document-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .document-title {
          flex: 1;
        }

        .document-title h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: var(--text);
        }

        .document-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        .document-actions {
          display: flex;
          gap: 8px;
        }

        .delete-button {
          padding: 6px 12px;
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-button:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }

        .document-details {
          background-color: var(--bg);
          padding: 12px;
          border-radius: 6px;
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
          flex: 1;
        }

        .detail-row .value.preview {
          color: var(--text-muted);
          font-style: italic;
        }

        .rag-info {
          margin-top: 20px;
          padding: 20px;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .rag-info h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--text);
        }

        .rag-info p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .rag-info ul {
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
          color: var(--text-muted);
        }

        .rag-info ul li {
          margin-bottom: 8px;
        }

        .rag-info ul li strong {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}

export default RAGPanel;
