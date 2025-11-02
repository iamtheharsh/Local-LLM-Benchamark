/**
 * Agentic Runtime - Core logic for intent detection and tool invocation
 *
 * Responsibilities:
 * - Perform lightweight intent detection
 * - Match user queries to available tools
 * - Execute matching tools
 * - Retrieve relevant context using RAG
 * - Measure latency and log events
 */

import { memoryManager } from './MemoryManager';
import { benchmarkManager } from './BenchmarkManager';

class AgentRuntime {
  constructor() {
    // Keywords for intent detection
    this.intentKeywords = {
      weather: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy'],
      search: ['search', 'find', 'look up', 'google', 'query'],
      translate: ['translate', 'translation', 'language', 'convert to'],
      summarize: ['summarize', 'summary', 'summarise', 'brief', 'overview'],
      api: ['fetch', 'get', 'request', 'api', 'endpoint', 'data'],
      news: ['news', 'latest', 'current', 'headlines'],
      time: ['time', 'date', 'when', 'schedule'],
      calc: ['calculate', 'compute', 'math', '+', '-', '*', '/']
    };

    this.toolCache = new Map();
    this.lastInvocations = [];
  }

  /**
   * Main entry point - process user input and invoke tools if needed
   * @param {string} userInput - The user's message
   * @param {Array} tools - Available tools from Tools Panel and MCP Panel
   * @param {Function} onLog - Logging callback
   * @returns {Promise<{text: string, fromTool: boolean, matchedTool?: object, fromRAG?: boolean, context?: Array}>}
   */
  async process(userInput, tools = [], onLog = () => {}) {
    const startTime = Date.now();

    // Normalize input
    const normalizedInput = userInput.toLowerCase().trim();

    onLog?.("info", "AGENT", `Received input: "${userInput.substring(0, 50)}${userInput.length > 50 ? '...' : ''}"`);

    // First, try RAG retrieval for contextual knowledge
    const contextSnippets = this.retrieveContext(userInput, onLog);

    // Find matching tool
    const matchedTool = this.findBestMatch(normalizedInput, tools);

    if (!matchedTool) {
      // No tool matched, proceed with normal LLM response
      return {
        text: null,
        fromTool: false,
        fromRAG: contextSnippets.length > 0,
        context: contextSnippets
      };
    }

    onLog?.("info", "AGENT", `Invoking tool "${matchedTool.name}"`);

    try {
      const result = await this.invokeTool(matchedTool, normalizedInput, onLog);
      const elapsed = Date.now() - startTime;

      onLog?.("debug", "AGENT", `Tool response received (${elapsed} ms)`);

      return {
        text: result,
        fromTool: true,
        matchedTool,
        latency: elapsed,
        fromRAG: contextSnippets.length > 0,
        context: contextSnippets
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      onLog?.("error", "AGENT", `Tool "${matchedTool.name}" failed: ${error.message}`);

      return {
        text: `❌ Tool execution failed: ${error.message}`,
        fromTool: true,
        matchedTool,
        error: true,
        latency: elapsed,
        fromRAG: contextSnippets.length > 0,
        context: contextSnippets
      };
    }
  }

  /**
   * Retrieve relevant context from memory using RAG
   * @param {string} query - User query
   * @param {Function} onLog - Logging callback
   * @returns {Array} Array of relevant context snippets
   */
  retrieveContext(query, onLog = () => {}) {
    const startTime = Date.now();

    // Search for similar chunks in memory
    const contextSnippets = memoryManager.searchSimilar(query, 3, onLog);

    const elapsed = Date.now() - startTime;

    // Log benchmark metrics for RAG
    if (contextSnippets.length > 0) {
      benchmarkManager.logMetric('RAG', 'retrieval_time', elapsed / 1000, {
        queryLength: query.length,
        snippetsCount: contextSnippets.length,
        avgSimilarity: contextSnippets.reduce((sum, s) => sum + s.similarity, 0) / contextSnippets.length
      });

      benchmarkManager.logMetric('RAG', 'context_snippets', contextSnippets.length, {
        retrievalTime: elapsed,
        queryLength: query.length
      });

      onLog?.("info", "RAG", `Retrieved ${contextSnippets.length} context snippets for query`, {
        queryLength: query.length,
        snippetsCount: contextSnippets.length,
        retrievalTime: elapsed
      });

      onLog?.("debug", "RAG", `Context retrieval completed in ${elapsed}ms`);

      // Format context snippets for LLM
      contextSnippets.forEach((snippet, idx) => {
        onLog?.("debug", "RAG", `Snippet ${idx + 1}: ${snippet.docName} (${(snippet.similarity * 100).toFixed(1)}% match)`, {
          docName: snippet.docName,
          similarity: snippet.similarity,
          chunkIndex: snippet.index
        });
      });
    }

    return contextSnippets;
  }

  /**
   * Enhance LLM prompt with retrieved context
   * @param {string} userInput - Original user input
   * @param {Array} contextSnippets - Retrieved context snippets
   * @returns {string} Enhanced prompt with context
   */
  buildContextualPrompt(userInput, contextSnippets) {
    if (!contextSnippets || contextSnippets.length === 0) {
      return userInput;
    }

    const contextSection = contextSnippets
      .map((snippet, idx) => {
        return `[Context ${idx + 1} from ${snippet.docName}]:\n${snippet.text}`;
      })
      .join('\n\n');

    return `User Query: ${userInput}

Relevant Context:
${contextSection}

Please use the above context to inform your response. If the context is relevant to the query, incorporate it into your answer.`;
  }

  /**
   * Find the best matching tool for the user input
   * @param {string} input - Normalized user input
   * @param {Array} tools - Available tools
   * @returns {object|null}
   */
  findBestMatch(input, tools) {
    if (!tools || tools.length === 0) {
      return null;
    }

    // Strategy 1: Direct name match
    for (const tool of tools) {
      if (!tool.active) continue;

      const toolName = tool.name.toLowerCase();
      if (input.includes(toolName)) {
        this.lastInvocations.push({ tool, timestamp: Date.now(), matchType: 'name' });
        return tool;
      }
    }

    // Strategy 2: Description match
    let bestMatch = null;
    let bestScore = 0;

    for (const tool of tools) {
      if (!tool.active) continue;

      const description = (tool.description || '').toLowerCase();
      const keywords = this.extractKeywords(description);

      const score = this.calculateSimilarity(input, keywords);

      if (score > bestScore && score > 0.3) { // Threshold for relevance
        bestScore = score;
        bestMatch = tool;
      }
    }

    if (bestMatch) {
      this.lastInvocations.push({ tool: bestMatch, timestamp: Date.now(), matchType: 'description', score: bestScore });
      return bestMatch;
    }

    // Strategy 3: Intent-based matching
    const detectedIntent = this.detectIntent(input);

    if (detectedIntent) {
      // Find tools that match the intent
      const intentTools = tools.filter(tool => {
        if (!tool.active) return false;

        const toolText = `${tool.name} ${tool.description || ''}`.toLowerCase();
        return detectedIntent.keywords.some(keyword => toolText.includes(keyword));
      });

      if (intentTools.length > 0) {
        // Return the most recently used or first available
        const selectedTool = intentTools[0];
        this.lastInvocations.push({ tool: selectedTool, timestamp: Date.now(), matchType: 'intent', intent: detectedIntent.name });
        return selectedTool;
      }
    }

    return null;
  }

  /**
   * Detect user intent based on keywords
   * @param {string} input - Normalized user input
   * @returns {object|null}
   */
  detectIntent(input) {
    let bestIntent = null;
    let bestMatchCount = 0;

    for (const [intentName, keywords] of Object.entries(this.intentKeywords)) {
      const matches = keywords.filter(keyword => input.includes(keyword)).length;

      if (matches > bestMatchCount) {
        bestMatchCount = matches;
        bestIntent = { name: intentName, keywords, matchCount: matches };
      }
    }

    return bestMatchCount > 0 ? bestIntent : null;
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to analyze
   * @returns {Array<string>}
   */
  extractKeywords(text) {
    if (!text) return [];

    // Remove common words and extract meaningful terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return text
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.toLowerCase());
  }

  /**
   * Calculate similarity between input and tool keywords
   * @param {string} input - User input
   * @param {Array<string>} keywords - Tool keywords
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(input, keywords) {
    if (keywords.length === 0) return 0;

    let matches = 0;
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        matches++;
      }
    }

    return matches / keywords.length;
  }

  /**
   * Invoke a specific tool
   * @param {object} tool - Tool object with endpoint, method, etc.
   * @param {string} userInput - Original user input
   * @param {Function} onLog - Logging callback
   * @returns {Promise<string>} - Formatted tool response
   */
  async invokeTool(tool, userInput, onLog) {
    const startTime = Date.now();

    try {
      // Parse tool configuration
      const method = tool.method || 'GET';
      const headers = this.parseJSON(tool.headers || '{}');
      const variables = this.parseJSON(tool.variablesSchema || '{}');

      // Build fetch options
      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      // Add body for non-GET requests
      if (method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(variables);
      }

      onLog?.("debug", "AGENT", `Making ${method} request to ${tool.endpoint}`);

      // Execute the request
      const response = await fetch(tool.endpoint, fetchOptions);
      const elapsed = Date.now() - startTime;

      // Log benchmark metrics for tool execution
      const isSuccess = response.status >= 200 && response.status < 300;
      benchmarkManager.logMetric('TOOLS', 'execution_time', elapsed, {
        toolName: tool.name,
        method,
        status: response.status,
        endpoint: tool.endpoint
      });

      benchmarkManager.logMetric('TOOLS', 'success_rate', isSuccess ? 1 : 0, {
        toolName: tool.name,
        status: response.status
      });

      onLog?.("debug", "AGENT", `HTTP ${response.status} - ${elapsed} ms`);

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      let responseData;
      if (isJson) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Format response for display
      return this.formatToolResponse(tool, responseData, response.status);

    } catch (error) {
      const elapsed = Date.now() - startTime;

      // Log benchmark metrics for failed tool execution
      benchmarkManager.logMetric('TOOLS', 'execution_time', elapsed, {
        toolName: tool.name,
        error: error.message
      });

      benchmarkManager.logMetric('TOOLS', 'success_rate', 0, {
        toolName: tool.name,
        error: error.message
      });

      onLog?.("error", "AGENT", `Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format tool response for chat display
   * @param {object} tool - Tool object
   * @param {any} data - Response data
   * @param {number} status - HTTP status code
   * @returns {string} - Formatted response
   */
  formatToolResponse(tool, data, status) {
    const timestamp = new Date().toLocaleTimeString();

    if (status >= 200 && status < 300) {
      // Success response
      if (typeof data === 'object') {
        return `🧩 **Tool Result: ${tool.name}** (${timestamp})\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      } else {
        return `🧩 **Tool Result: ${tool.name}** (${timestamp})\n\n${data}`;
      }
    } else {
      // Error response
      return `⚠️ **Tool Error: ${tool.name}** (${timestamp})\n\nStatus: ${status}\n\n\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }
  }

  /**
   * Parse JSON string safely
   * @param {string} jsonString - JSON string to parse
   * @returns {object} - Parsed object or empty object
   */
  parseJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  }

  /**
   * Get recent invocations for debugging/analysis
   * @returns {Array} - Last invocations
   */
  getRecentInvocations() {
    return this.lastInvocations.slice(-10);
  }

  /**
   * Clear invocation history
   */
  clearHistory() {
    this.lastInvocations = [];
  }
}

// Export singleton instance
export const agentRuntime = new AgentRuntime();
export default agentRuntime;
