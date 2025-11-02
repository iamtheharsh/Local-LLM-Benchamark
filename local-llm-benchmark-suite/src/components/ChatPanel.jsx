import React, { useState, useRef, useEffect } from "react";
import { agentRuntime } from "../agent/AgentRuntime";
import { benchmarkManager } from "../agent/BenchmarkManager";
import { useTools } from "../context/ToolContext";

function ChatPanel({ onLog }) {
  const { registeredTools, getStats } = useTools();

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "user",
      text: "Hello! Can you help me test this local LLM setup?",
      timestamp: "10:30 AM",
      tokens: { input: 15, output: 0 }
    },
    {
      id: 2,
      type: "llm",
      text: "Hello! I'd be happy to help you test the Local LLM Benchmark Suite. How can I assist you today?",
      timestamp: "10:30 AM",
      tokens: { input: 15, output: 24 },
      latency: 1.23,
      inputTokens: 15,
      outputTokens: 24
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const toolStats = getStats();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Mock LLM API call
  const callLLM = async (prompt) => {
    const startTime = Date.now();
    onLog?.("info", "CHAT", `User prompt sent: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    // Simulate response with some variance
    const responses = [
      "I understand you're testing the Local LLM Benchmark Suite. This is a simulated response for development purposes. The actual integration with Apple Intelligence or Ollama will be implemented in future phases.",
      "That's an interesting question! I can help you with benchmarking local LLMs. This interface tracks token throughput, latency, memory usage, and other metrics in real-time.",
      "The benchmark results show strong performance for local inference. Token processing speed: ~42 tokens/second with average latency of 1.2s per response.",
      "I'm running local model inference tests. The system is tracking all metrics including CPU usage, memory consumption, and battery impact during generation."
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const latency = (1 + Math.random()).toFixed(2);

    // Log benchmark metrics
    benchmarkManager.logMetric('CHAT', 'latency', parseFloat(latency), {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    });

    benchmarkManager.logMetric('CHAT', 'tokens_per_second', outputTokens / parseFloat(latency), {
      inputTokens,
      outputTokens,
      latency
    });

    onLog?.("info", "CHAT", `Response received (${latency}s)`);
    onLog?.("debug", "CHAT", `Token count: Input ${inputTokens} | Output ${outputTokens}`);

    return {
      text: response,
      inputTokens,
      outputTokens,
      latency: parseFloat(latency)
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tokens: { input: Math.ceil(input.trim().length / 4), output: 0 }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      // First, try to process with agentic runtime (check for tool invocation)
      onLog?.("debug", "CHAT", `Processing message with ${registeredTools.length} available tools`);
      const agentResult = await agentRuntime.process(userMessage.text, registeredTools, onLog);

      if (agentResult.fromTool) {
        // Tool was invoked - display tool response
        const toolMessage = {
          id: Date.now() + 1,
          type: "llm",
          text: agentResult.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fromTool: true,
          tool: agentResult.matchedTool,
          latency: agentResult.latency || 0,
          fromRAG: agentResult.fromRAG,
          context: agentResult.context,
          tokens: { input: userMessage.tokens.input, output: Math.ceil((agentResult.text || '').length / 4) }
        };

        onLog?.("info", "CHAT", `Tool "${agentResult.matchedTool.name}" result displayed in chat`);

        if (agentResult.fromRAG) {
          onLog?.("info", "CHAT", `RAG context displayed (${agentResult.context.length} snippets)`);
        }

        setMessages(prev => [...prev, toolMessage]);
      } else {
        // No tool matched - proceed with normal LLM response
        onLog?.("info", "CHAT", "No tool match - generating LLM response");

        // Include RAG context in the LLM call if available
        let llmPrompt = userMessage.text;
        if (agentResult.fromRAG && agentResult.context && agentResult.context.length > 0) {
          llmPrompt = agentRuntime.buildContextualPrompt(userMessage.text, agentResult.context);
          onLog?.("info", "CHAT", `Enhanced prompt with ${agentResult.context.length} RAG snippets`);
        }

        const response = await callLLM(llmPrompt);

        const llmMessage = {
          id: Date.now() + 1,
          type: "llm",
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fromRAG: agentResult.fromRAG,
          context: agentResult.context,
          tokens: {
            input: response.inputTokens,
            output: response.outputTokens
          },
          latency: response.latency
        };

        if (agentResult.fromRAG) {
          onLog?.("info", "CHAT", `RAG context displayed (${agentResult.context.length} snippets)`);
        }

        setMessages(prev => [...prev, llmMessage]);
      }
    } catch (error) {
      onLog?.("error", "CHAT", `Failed to process message: ${error.message}`);
      const errorMessage = {
        id: Date.now() + 1,
        type: "llm",
        text: "Sorry, I encountered an error while processing your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      {/* Thinking Mode Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '8px'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={showThinking}
            onChange={(e) => setShowThinking(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>Show Thinking</span>
        </label>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {messages.map((message) => (
          <div key={message.id}>
            <div className={`message ${message.type} ${message.isError ? 'error' : ''} ${message.fromTool ? 'from-tool' : ''} ${message.fromRAG ? 'from-rag' : ''}`}>
              <div className="message-header">
                {message.fromTool && (
                  <div className="tool-badge">
                    🧩 Tool{message.tool && `: ${message.tool.name}`}
                  </div>
                )}
                {message.fromTool && message.tool && (
                  <div className="tool-source">
                    {message.tool.source === 'mcp' ? `via ${message.tool.serverName}` : 'Direct HTTP'}
                  </div>
                )}
                {message.fromRAG && !message.fromTool && (
                  <div className="rag-badge">
                    🧠 RAG
                  </div>
                )}
              </div>
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp}
                {message.latency && (
                  <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Tokens: In {message.tokens.input} | Out {message.tokens.output}
                    {message.fromTool ? ` | ${message.latency}ms` : ` | ${message.latency}s`}
                  </span>
                )}
              </div>
            </div>

            {/* RAG Context Section */}
            {message.fromRAG && message.context && message.context.length > 0 && (
              <div className="rag-context">
                <div className="rag-context-header">
                  <span className="rag-context-icon">🧠</span>
                  <span className="rag-context-title">Context Used ({message.context.length} sources)</span>
                </div>
                <div className="rag-context-snippets">
                  {message.context.map((snippet, idx) => (
                    <div key={idx} className="rag-snippet">
                      <div className="rag-snippet-header">
                        <span className="rag-snippet-doc">{snippet.docName}</span>
                        <span className="rag-snippet-score">
                          {(snippet.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <div className="rag-snippet-text">
                        {snippet.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thinking Block (placeholder for future use) */}
            {message.type === "llm" && showThinking && (
              <div className="message thinking" style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--surface)',
                border: '1px dashed var(--border-light)',
                borderRadius: '8px',
                padding: '12px 16px',
                margin: '4px 0 12px 0',
                maxWidth: '85%',
                fontSize: '13px',
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}>
                <span>🤔 (Thinking process will appear here...)</span>
              </div>
            )}
          </div>
        ))}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="message llm" style={{
            alignSelf: 'flex-start',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            className="chat-input"
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            disabled={isThinking}
            style={{
              opacity: isThinking ? 0.7 : 1,
              cursor: isThinking ? 'wait' : 'text'
            }}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? '⏳' : 'Send'}
          </button>
        </div>
        <div className="input-hint">
          {isThinking
            ? 'Generating response...'
            : `Connected to local LLM • ${toolStats.total} tools available (${toolStats.toolsPanel} direct, ${toolStats.mcp} via ${toolStats.mcp} MCP servers)`}
        </div>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background-color: var(--accent);
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .message.error {
          border: 1px solid var(--error);
          background-color: rgba(239, 68, 68, 0.1) !important;
        }

        .message.from-tool {
          border: 1px solid rgba(var(--accent-rgb), 0.3);
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, rgba(var(--surface), 0.95) 100%);
          position: relative;
          overflow: hidden;
        }

        .message.from-tool::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.3));
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .tool-badge {
          padding: 4px 12px;
          background: linear-gradient(135deg, var(--accent), rgba(var(--accent-rgb), 0.8));
          color: white;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3);
          animation: pulse-badge 2s infinite;
        }

        @keyframes pulse-badge {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3);
          }
          50% {
            box-shadow: 0 2px 12px rgba(var(--accent-rgb), 0.5);
          }
        }

        .tool-source {
          padding: 2px 8px;
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .message-content {
          margin-bottom: 8px;
          line-height: 1.6;
        }

        .message-content pre {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          overflow-x: auto;
          font-size: 12px;
          margin: 8px 0;
        }

        .message-content code {
          background-color: var(--bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          color: var(--accent);
        }

        .message.from-rag {
          border: 1px solid rgba(59, 130, 246, 0.3);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(var(--surface), 0.95) 100%);
          position: relative;
          overflow: hidden;
        }

        .message.from-rag::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, rgba(59, 130, 246, 0.3));
          animation: shimmer 2s infinite;
        }

        .rag-badge {
          padding: 4px 12px;
          background: linear-gradient(135deg, #3b82f6, rgba(59, 130, 246, 0.8));
          color: white;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          animation: pulse-badge 2s infinite;
        }

        @keyframes pulse-badge {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 2px 12px rgba(59, 130, 246, 0.5);
          }
        }

        .rag-context {
          margin-top: 8px;
          margin-left: 20px;
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
          max-width: 85%;
        }

        .rag-context-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .rag-context-icon {
          font-size: 16px;
        }

        .rag-context-title {
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
        }

        .rag-context-snippets {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rag-snippet {
          background-color: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px;
        }

        .rag-snippet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .rag-snippet-doc {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
        }

        .rag-snippet-score {
          font-size: 11px;
          color: #3b82f6;
          font-weight: 600;
        }

        .rag-snippet-text {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

export default ChatPanel;
