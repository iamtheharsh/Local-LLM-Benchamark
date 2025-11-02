# Local LLM Benchmark Suite

A comprehensive testing interface for evaluating local Large Language Models (LLMs) performance, resource consumption, and capabilities on macOS.

## Overview

This application provides a three-panel interface for:
- **Chat Interface**: Test local LLMs with multimodal inputs
- **Agentic Capabilities**: Manage tools and MCP servers
- **RAG**: Manage vector databases and retrieval-augmented generation
- **Resource Monitoring**: Track RAM, CPU, and battery consumption
- **Event Logging**: Comprehensive operation logs with filtering

## Prerequisites

- Node.js (version 16 or higher)
- Rust (latest stable version)
- Xcode Command Line Tools (on macOS)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Rust dependencies:
```bash
cd src-tauri
cargo build
cd ..
```

## Running the Application

### Development Mode

Start the development server:
```bash
npm run tauri dev
```

This will:
- Start the Vite development server on http://localhost:1420
- Launch the Tauri application window
- Enable hot reload for both frontend and backend

### Building for Production

Build the application:
```bash
npm run tauri build
```

This creates a distributable app in `src-tauri/target/release/bundle/`.

## Project Structure

```
local-llm-benchmark-suite/
├── src/
│   ├── components/
│   │   ├── ChatPanel.jsx          # Chat interface component
│   │   ├── AgenticPanel.jsx       # Agentic capabilities tab
│   │   ├── RAGPanel.jsx           # RAG management tab
│   │   ├── ToolsPanel.jsx         # Tools management tab
│   │   └── MCPPanel.jsx           # MCP management tab
│   ├── agent/
│   │   ├── AgentRuntime.js        # Agentic runtime engine
│   │   ├── MemoryManager.js       # Memory/context management
│   │   └── BenchmarkManager.js    # Metrics collection engine
│   ├── context/
│   │   ├── ToolContext.jsx        # Tool state management
│   │   └── MemoryContext.jsx      # Memory state management
│   ├── panels/
│   │   ├── ResourceMonitor.jsx    # Resource monitoring display
│   │   ├── LogsPanel.jsx          # Event logging display
│   │   └── BenchmarkDashboard.jsx # Analytics dashboard
│   ├── utils/
│   │   ├── metrics.js             # System metrics utilities
│   │   └── logger.js              # Logging utility
│   ├── App.jsx                    # Main application component
│   └── main.jsx                   # React entry point
├── src-tauri/
│   ├── src/
│   │   └── main.rs                # Rust backend entry point
│   ├── Cargo.toml                 # Rust dependencies
│   └── build.rs                   # Build configuration
├── tauri.conf.json                # Tauri configuration
├── package.json                   # Node.js dependencies
├── vite.config.js                 # Vite configuration
└── index.html                     # HTML entry point
```

## Features

### Phase 1-10 ✅ COMPLETED
- ✅ Basic project structure
- ✅ Three-panel layout (Left: Tabs, Center: Resources, Right: Logs)
- ✅ Tab navigation system (Chat, Agentic, RAG, Tools, MCP, Benchmark)
- ✅ Dark theme UI with professional styling
- ✅ Modular component architecture

### Phase 2: Chat Interface ✅
- ✅ Functional chat UI with message history
- ✅ Simulated LLM responses with latency tracking
- ✅ Token counting and metrics display
- ✅ Real-time thinking indicator
- ✅ Scroll-to-bottom and auto-scroll
- ✅ Agentic tool integration
- ✅ RAG context display

### Phase 3: System Resources ✅
- ✅ Live resource monitoring (RAM/CPU/Battery)
- ✅ Real-time metrics with threshold warnings
- ✅ Visual progress bars with color coding
- ✅ Polling system (1-second intervals)
- ✅ Tauri backend integration (with web fallback)

### Phase 4: Event Logging ✅
- ✅ Comprehensive event logging system
- ✅ Multi-level logs (info, debug, warning, error)
- ✅ Category-based filtering
- ✅ Timestamps and log management
- ✅ Console integration with custom logger

### Phase 5: Tools Management ✅
- ✅ Tool creation and editing interface
- ✅ HTTP tool configuration (GET, POST, PUT, DELETE)
- ✅ JSON schema validation for variables and headers
- ✅ Tool testing with latency measurement
- ✅ Response size and status tracking
- ✅ Enable/disable toggles

### Phase 7: MCP Integration ✅
- ✅ MCP server management UI
- ✅ Server connection with latency measurement
- ✅ Tool discovery from connected servers
- ✅ Authentication token support
- ✅ Connect/disconnect functionality
- ✅ Simulated tool execution testing
- ✅ Integration hook for agentic pipelines

### Phase 8: Agentic Runtime ✅
- ✅ Intent detection with keyword matching
- ✅ Multi-strategy tool matching
- ✅ Automatic tool invocation
- ✅ Latency measurement and tracking

### Phase 9: Memory Management ✅
- ✅ Chunk-based memory storage
- ✅ Text similarity matching
- ✅ RAG context retrieval
- ✅ Memory integration with chat

### Phase 10: Benchmark Dashboard ✅
- ✅ Real-time metrics collection
- ✅ Interactive analytics dashboard
- ✅ Visual charts (line, area charts)
- ✅ Time window filters
- ✅ Export functionality (JSON/CSV)
- ✅ Performance tracking (latency, throughput, success rate)

## Development

This project uses:
- **Tauri** for native desktop app framework
- **React** for UI components
- **Vite** for fast development and building
- **Rust** for backend operations

## Troubleshooting

### Issue: Permission denied when running `npm run tauri dev`
**Solution**: Make sure Xcode Command Line Tools are installed:
```bash
xcode-select --install
```

### Issue: Rust compilation errors
**Solution**: Update Rust to latest stable version:
```bash
rustup update stable
```

### Issue: Module not found errors
**Solution**: Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## License

MIT

## Contributing

This is a personal project for benchmarking local LLMs. Feel free to fork and modify for your needs.

## Current Status (November 2025)

### 🎉 Phase 10 Complete: Benchmark Metrics & Analytics Dashboard

The Local LLM Benchmark Suite is now a comprehensive **local AI agent framework** with complete benchmarking and analytics capabilities:

**✅ Fully Implemented:**
- Six-tab interface (Chat, Agentic, RAG, Tools, MCP, Benchmark)
- Real-time system resource monitoring
- Comprehensive event logging
- Tool management with HTTP API support
- MCP server connectivity and tool discovery
- Agentic runtime with intent detection
- Memory management and RAG context
- **Analytics dashboard with charts and metrics export**
- Production-ready build system

**📊 Benchmarking Capabilities:**
- Track latency, throughput, and success rates
- Visual charts with Recharts library
- Time window filtering (5min, 30min, 1hr, 24hr)
- Export metrics as JSON or CSV
- Memory usage tracking
- CPU correlation analysis

**🚀 Access the Application:**
```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build
```

Visit http://localhost:1420/ to use the application.

**📊 Architecture:**
The application is now a complete **local AI benchmarking platform** that can:
- Connect to multiple MCP servers simultaneously
- Manage and test HTTP-based tools
- Monitor system resources in real-time
- Track performance metrics across all operations
- Log all operations with comprehensive filtering
- Export benchmark data for analysis
- Provide a foundation for agentic AI workflows

This positions the suite as a robust **local alternative to cloud-based AI agents** with full benchmarking capabilities for comparative LLM analysis.
