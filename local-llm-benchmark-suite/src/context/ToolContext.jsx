import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

/**
 * ToolContext - Unified tool registry for both Tools Panel and MCP Panel
 *
 * Provides:
 * - Centralized list of all available tools
 * - Real-time updates when tools are added/removed
 * - Helper functions for tool management
 */

const ToolContext = createContext();

export const useTools = () => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTools must be used within a ToolProvider');
  }
  return context;
};

export const ToolProvider = ({ children }) => {
  // Separate state for Tools Panel tools and MCP tools
  const [toolsPanelTools, setToolsPanelTools] = useState([]);
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);

  // Transform MCP server tools to unified format
  const transformMcpTools = useCallback((servers) => {
    const transformed = [];

    servers.forEach(server => {
      if (server.connected && server.tools && server.tools.length > 0) {
        server.tools.forEach(tool => {
          transformed.push({
            id: `mcp_${server.id}_${tool.name}`,
            name: tool.name,
            description: tool.description,
            endpoint: `mcp://${server.url}/${tool.name}`,
            method: 'GET', // MCP tools don't use HTTP directly
            timeout: 10000,
            active: true,
            source: 'mcp',
            serverId: server.id,
            serverName: server.name,
            createdAt: new Date().toLocaleTimeString(),
            // Add MCP-specific metadata
            mcpMetadata: {
              serverUrl: server.url,
              authToken: server.authToken
            }
          });
        });
      }
    });

    return transformed;
  }, []);

  // Update MCP tools when servers change
  useEffect(() => {
    const transformed = transformMcpTools(mcpServers);
    setMcpTools(transformed);
  }, [mcpServers, transformMcpTools]);

  // Unified list of all active tools
  const registeredTools = React.useMemo(() => {
    const allTools = [
      ...toolsPanelTools.filter(tool => tool.active),
      ...mcpTools.filter(tool => tool.active)
    ];

    // Sort by source (Tools Panel first, then MCP)
    return allTools.sort((a, b) => {
      if (a.source === 'tools' && b.source === 'mcp') return -1;
      if (a.source === 'mcp' && b.source === 'tools') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [toolsPanelTools, mcpTools]);

  // Add a tool from Tools Panel
  const addTool = useCallback((tool) => {
    setToolsPanelTools(prev => [...prev, {
      ...tool,
      source: 'tools'
    }]);
  }, []);

  // Update a tool from Tools Panel
  const updateTool = useCallback((toolId, updates) => {
    setToolsPanelTools(prev => prev.map(tool =>
      tool.id === toolId ? { ...tool, ...updates } : tool
    ));
  }, []);

  // Remove a tool from Tools Panel
  const removeTool = useCallback((toolId) => {
    setToolsPanelTools(prev => prev.filter(tool => tool.id !== toolId));
  }, []);

  // Toggle tool active state
  const toggleTool = useCallback((toolId) => {
    const tool = [...toolsPanelTools, ...mcpTools].find(t => t.id === toolId);
    if (!tool) return;

    if (tool.source === 'tools') {
      setToolsPanelTools(prev => prev.map(t =>
        t.id === toolId ? { ...t, active: !t.active } : t
      ));
    }
    // Note: MCP tool toggle would require updating the server state
    // This is handled by MCPPanel component
  }, [toolsPanelTools, mcpTools]);

  // Update MCP servers
  const setMcpServersState = useCallback((servers) => {
    setMcpServers(servers);
  }, []);

  // Get tools by source
  const getToolsBySource = useCallback((source) => {
    return registeredTools.filter(tool => tool.source === source);
  }, [registeredTools]);

  // Search tools by name or description
  const searchTools = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    return registeredTools.filter(tool =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      (tool.description && tool.description.toLowerCase().includes(lowerQuery))
    );
  }, [registeredTools]);

  // Get tool by ID
  const getToolById = useCallback((toolId) => {
    return registeredTools.find(tool => tool.id === toolId);
  }, [registeredTools]);

  // Get statistics
  const getStats = useCallback(() => {
    const toolsPanelCount = toolsPanelTools.filter(t => t.active).length;
    const mcpCount = mcpTools.length;
    const total = toolsPanelCount + mcpCount;

    return {
      total,
      toolsPanel: toolsPanelCount,
      mcp: mcpCount,
      inactive: toolsPanelTools.filter(t => !t.active).length
    };
  }, [toolsPanelTools, mcpTools]);

  // Clear all tools (useful for testing)
  const clearAllTools = useCallback(() => {
    setToolsPanelTools([]);
    setMcpServers([]);
  }, []);

  const value = {
    // State
    toolsPanelTools,
    mcpTools,
    mcpServers,
    registeredTools,

    // Actions for Tools Panel
    addTool,
    updateTool,
    removeTool,
    toggleTool,

    // Actions for MCP Panel
    setMcpServers: setMcpServersState,

    // Utility functions
    getToolsBySource,
    searchTools,
    getToolById,
    getStats,

    // Debug/Testing
    clearAllTools
  };

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
};

// Helper component for wrapping the app
export const ToolProviderWrapper = ({ children }) => {
  return (
    <ToolProvider>
      {children}
    </ToolProvider>
  );
};

export default ToolContext;
