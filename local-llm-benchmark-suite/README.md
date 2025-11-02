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
│   ├── panels/
│   │   ├── ResourceMonitor.jsx    # Resource monitoring display
│   │   └── LogsPanel.jsx          # Event logging display
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

### Phase 1 (Current)
- ✅ Basic project structure
- ✅ Three-panel layout
- ✅ Tab navigation system
- ✅ Dark theme UI
- ✅ Modular component architecture

### Coming in Phase 2+
- Chat interface with multimodal support
- Live resource monitoring (RAM/CPU/Battery)
- Comprehensive event logging
- Agentic tool management
- MCP integration
- RAG database management

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
