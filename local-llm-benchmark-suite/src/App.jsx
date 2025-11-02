import React, { useState } from "react";
import ChatPanel from "./components/ChatPanel";
import AgenticPanel from "./components/AgenticPanel";
import RAGPanel from "./components/RAGPanel";
import ToolsPanel from "./components/ToolsPanel";
import MCPPanel from "./components/MCPPanel";
import ResourceMonitor from "./panels/ResourceMonitor";
import LogsPanel from "./panels/LogsPanel";
import { logger } from "./utils/logger";

function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [logs, setLogs] = useState([
    {
      id: 1,
      level: "info",
      category: "SYSTEM",
      timestamp: "10:31:42",
      message: "Application started - Local LLM Benchmark Suite"
    },
    {
      id: 2,
      level: "debug",
      category: "SYSTEM",
      timestamp: "10:31:43",
      message: "All components initialized"
    },
    {
      id: 3,
      level: "info",
      category: "SYSTEM",
      timestamp: "10:31:45",
      message: "Ready for LLM testing"
    }
  ]);

  // Centralized log event creator
  const logEvent = (level, category, message) => {
    const newLog = {
      id: Date.now(),
      level,
      category: category.toUpperCase(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message
    };

    setLogs(prev => [...prev, newLog]);

    // Also log to console logger
    const loggerLevel = level.toLowerCase();
    if (logger[loggerLevel]) {
      logger[loggerLevel](category.toUpperCase(), message);
    }
  };

  const tabs = [
    { id: "chat", label: "Chat", component: ChatPanel },
    { id: "agentic", label: "Agentic", component: AgenticPanel },
    { id: "rag", label: "RAG", component: RAGPanel },
    { id: "tools", label: "Tools", component: ToolsPanel },
    { id: "mcp", label: "MCP", component: MCPPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ChatPanel;

  // Log app initialization
  React.useEffect(() => {
    logger.info("APP", "Application initialized", { activeTab: "chat" });
    logEvent("info", "SYSTEM", "Application started - Local LLM Benchmark Suite");

    // Listen for clear logs event
    const handleClearLogs = () => {
      setLogs([]);
    };
    window.addEventListener('clear-logs', handleClearLogs);

    return () => {
      window.removeEventListener('clear-logs', handleClearLogs);
    };
  }, []);

  const handleTabChange = (tabId) => {
    logger.info("UI", `Tab changed to ${tabId}`);
    setActiveTab(tabId);
    logEvent("info", "UI", `Switched to ${tabId} tab`);
  };

  const getCurrentComponent = () => {
    const TabComponent = ActiveComponent;
    // Pass logEvent to components that need it
    if (activeTab === "chat" || activeTab === "tools" || activeTab === "mcp") {
      return <TabComponent onLog={logEvent} />;
    }
    return <TabComponent />;
  };

  return (
    <div className="app-container">
      {/* Left Panel - Core Application */}
      <div className="panel">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: "auto", backgroundColor: "var(--bg)" }}>
          {getCurrentComponent()}
        </div>
      </div>

      {/* Center Panel - Resource Monitoring */}
      <div className="panel">
        <ResourceMonitor onLog={logEvent} />
      </div>

      {/* Right Panel - Logs */}
      <div className="panel">
        <LogsPanel logs={logs} onLogEvent={logEvent} />
      </div>
    </div>
  );
}

export default App;
