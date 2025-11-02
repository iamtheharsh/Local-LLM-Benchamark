import React, { useState, useRef, useEffect } from "react";

function ChatPanel({ onLog }) {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Mock LLM API call
  const callLLM = async (prompt) => {
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
      const response = await callLLM(userMessage.text);

      const llmMessage = {
        id: Date.now() + 1,
        type: "llm",
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokens: {
          input: response.inputTokens,
          output: response.outputTokens
        },
        latency: response.latency
      };

      setMessages(prev => [...prev, llmMessage]);
    } catch (error) {
      onLog?.("error", "CHAT", `Failed to get LLM response: ${error.message}`);
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
            <div className={`message ${message.type} ${message.isError ? 'error' : ''}`}>
              <div>{message.text}</div>
              <div className="message-time">
                {message.timestamp}
                {message.latency && (
                  <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Tokens: In {message.tokens.input} | Out {message.tokens.output} | {message.latency}s
                  </span>
                )}
              </div>
            </div>

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
            : 'Connected to local LLM • Ready for testing'}
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
      `}</style>
    </div>
  );
}

export default ChatPanel;
