import React, { createContext, useState, useContext, useCallback } from 'react';
import { memoryManager } from '../agent/MemoryManager';

/**
 * MemoryContext - Unified memory registry for RAG system
 *
 * Provides:
 * - Document management (add, delete, list)
 * - Search functionality with similarity scoring
 * - Memory statistics and analytics
 * - Real-time updates for UI components
 */

const MemoryContext = createContext();

export const useMemory = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};

export const MemoryProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    documents: 0,
    chunks: 0,
    size: 0,
    sizeKB: '0.00',
    sizeMB: '0.00',
    avgChunkSize: 0
  });

  // Update stats from memory manager
  const updateStats = useCallback(() => {
    const newStats = memoryManager.getStats();
    setStats(newStats);
    return newStats;
  }, []);

  // Add a document
  const addDocument = useCallback((name, text, onLog = () => {}) => {
    const docInfo = memoryManager.addDocument(name, text, onLog);
    setDocuments(memoryManager.getAllDocuments());
    updateStats();
    return docInfo;
  }, [updateStats]);

  // Search for similar chunks
  const searchSimilar = useCallback((query, topK = 3, onLog = () => {}) => {
    return memoryManager.searchSimilar(query, topK, onLog);
  }, []);

  // Clear all memory
  const clearMemory = useCallback((onLog = () => {}) => {
    memoryManager.clearMemory(onLog);
    setDocuments([]);
    updateStats();
  }, [updateStats]);

  // Delete a specific document
  const deleteDocument = useCallback((docId, onLog = () => {}) => {
    const success = memoryManager.deleteDocument(docId, onLog);
    if (success) {
      setDocuments(memoryManager.getAllDocuments());
      updateStats();
    }
    return success;
  }, [updateStats]);

  // Re-embed all documents
  const reembedAll = useCallback((onLog = () => {}) => {
    const result = memoryManager.reembedAll(onLog);
    updateStats();
    return result;
  }, [updateStats]);

  // Get document by ID
  const getDocument = useCallback((docId) => {
    return documents.find(doc => doc.id === docId);
  }, [documents]);

  // Get chunks for a document
  const getDocumentChunks = useCallback((docId) => {
    return memoryManager.getDocumentChunks(docId);
  }, []);

  // Refresh documents list
  const refreshDocuments = useCallback(() => {
    setDocuments(memoryManager.getAllDocuments());
    updateStats();
  }, [updateStats]);

  // Initial load
  React.useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const value = {
    // State
    documents,
    stats,

    // Actions
    addDocument,
    searchSimilar,
    clearMemory,
    deleteDocument,
    reembedAll,
    refreshDocuments,
    getDocument,
    getDocumentChunks,
    updateStats
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
};

// Helper component for wrapping the app
export const MemoryProviderWrapper = ({ children }) => {
  return (
    <MemoryProvider>
      {children}
    </MemoryProvider>
  );
};

export default MemoryContext;
