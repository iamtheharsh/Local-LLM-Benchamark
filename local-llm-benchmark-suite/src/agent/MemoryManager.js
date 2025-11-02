/**
 * MemoryManager - RAG Memory Storage and Retrieval System
 *
 * Responsibilities:
 * - Store and retrieve contextual knowledge from documents
 * - Simulate embeddings using word overlap and TF-IDF-like scoring
 * - Provide searchSimilar functionality with top-K results
 */

class MemoryManager {
  constructor() {
    this.documents = new Map();
    this.chunks = [];
    this.chunkSize = 500; // characters per chunk
    this.chunkOverlap = 50; // overlap between chunks
    this.nextDocId = 1;
  }

  /**
   * Add a document to memory
   * @param {string} name - Document name
   * @param {string} text - Document content
   * @param {Function} onLog - Logging callback
   * @returns {object} Document info with ID and stats
   */
  addDocument(name, text, onLog = () => {}) {
    const startTime = Date.now();
    const docId = this.nextDocId++;

    // Split text into chunks
    const chunks = this.splitIntoChunks(text);

    // Process chunks with metadata
    const processedChunks = chunks.map((chunk, index) => {
      const words = this.tokenize(chunk);
      const wordFreq = this.calculateWordFrequency(words);

      return {
        id: `${docId}_${index}`,
        docId,
        docName: name,
        text: chunk,
        words,
        wordFreq,
        wordCount: words.length,
        timestamp: new Date().toISOString(),
        index
      };
    });

    // Store document
    const docInfo = {
      id: docId,
      name,
      text,
      size: text.length,
      chunkCount: chunks.length,
      addedAt: new Date().toISOString()
    };

    this.documents.set(docId, docInfo);
    this.chunks.push(...processedChunks);

    const elapsed = Date.now() - startTime;
    const sizeKB = (text.length / 1024).toFixed(2);

    onLog("info", "RAG", `Document "${name}" added (${sizeKB} KB, ${chunks.length} chunks)`, {
      docId,
      size: text.length,
      chunkCount: chunks.length,
      processingTime: elapsed
    });

    onLog("debug", "RAG", `Document "${name}" processed in ${elapsed}ms`);

    return {
      ...docInfo,
      processingTime: elapsed
    };
  }

  /**
   * Search for similar chunks using basic similarity scoring
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   * @param {Function} onLog - Logging callback
   * @returns {Array} Array of similar chunks with scores
   */
  searchSimilar(query, topK = 3, onLog = () => {}) {
    if (this.chunks.length === 0) {
      onLog("debug", "RAG", `Search for query "${query}" returned 0 results (memory empty)`);
      return [];
    }

    const startTime = Date.now();
    const queryWords = this.tokenize(query);
    const queryFreq = this.calculateWordFrequency(queryWords);

    // Calculate similarity scores for all chunks
    const scoredChunks = this.chunks.map(chunk => {
      const score = this.calculateSimilarity(queryFreq, chunk.wordFreq);
      return {
        ...chunk,
        similarity: score
      };
    });

    // Sort by similarity and get top K
    const results = scoredChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(result => result.similarity > 0.1); // Minimum threshold

    const elapsed = Date.now() - startTime;

    onLog("debug", "RAG", `Search for query "${query}" returned ${results.length} snippets`, {
      queryLength: query.length,
      topK,
      resultsCount: results.length,
      searchTime: elapsed
    });

    onLog("debug", "RAG", `Search completed in ${elapsed}ms`);

    return results;
  }

  /**
   * Clear all memory
   * @param {Function} onLog - Logging callback
   */
  clearMemory(onLog = () => {}) {
    const docCount = this.documents.size;
    const chunkCount = this.chunks.length;

    this.documents.clear();
    this.chunks = [];

    onLog("info", "RAG", `Memory cleared (${docCount} documents, ${chunkCount} chunks)`);
  }

  /**
   * Get memory statistics
   * @returns {object} Memory stats
   */
  getStats() {
    const totalDocuments = this.documents.size;
    const totalChunks = this.chunks.length;
    const totalSize = Array.from(this.documents.values())
      .reduce((sum, doc) => sum + doc.size, 0);

    return {
      documents: totalDocuments,
      chunks: totalChunks,
      size: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      avgChunkSize: totalChunks > 0 ? Math.round(totalSize / totalChunks) : 0
    };
  }

  /**
   * Get all documents
   * @returns {Array} Array of document info
   */
  getAllDocuments() {
    return Array.from(this.documents.values());
  }

  /**
   * Get chunks for a specific document
   * @param {number} docId - Document ID
   * @returns {Array} Array of chunks
   */
  getDocumentChunks(docId) {
    return this.chunks.filter(chunk => chunk.docId === docId);
  }

  /**
   * Split text into overlapping chunks
   * @param {string} text - Text to split
   * @returns {Array} Array of text chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    const words = text.split(/\s+/);

    let currentChunk = [];
    let currentLength = 0;

    for (const word of words) {
      const wordLength = word.length + 1; // +1 for space

      if (currentLength + wordLength > this.chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push(currentChunk.join(' '));

        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - Math.floor(this.chunkOverlap / 5));
        currentChunk = currentChunk.slice(overlapStart);
        currentLength = currentChunk.join(' ').length;
      }

      currentChunk.push(word);
      currentLength += wordLength;
    }

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Tokenize text into words
   * @param {string} text - Text to tokenize
   * @returns {Array} Array of words
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Calculate word frequency map
   * @param {Array} words - Array of words
   * @returns {Map} Word frequency map
   */
  calculateWordFrequency(words) {
    const freq = new Map();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    return freq;
  }

  /**
   * Calculate similarity between two word frequency maps using cosine similarity
   * @param {Map} freq1 - First word frequency map
   * @param {Map} freq2 - Second word frequency map
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(freq1, freq2) {
    if (freq1.size === 0 || freq2.size === 0) {
      return 0;
    }

    // Get all unique words
    const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const word of allWords) {
      const count1 = freq1.get(word) || 0;
      const count2 = freq2.get(word) || 0;

      dotProduct += count1 * count2;
      magnitude1 += count1 * count1;
      magnitude2 += count2 * count2;
    }

    // Cosine similarity
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Re-embed all documents (simulated refresh)
   * @param {Function} onLog - Logging callback
   * @returns {object} Re-embedding stats
   */
  reembedAll(onLog = () => {}) {
    const startTime = Date.now();
    const docCount = this.documents.size;

    // Simulate re-embedding by recalculating word frequencies
    this.chunks.forEach(chunk => {
      chunk.words = this.tokenize(chunk.text);
      chunk.wordFreq = this.calculateWordFrequency(chunk.words);
      chunk.wordCount = chunk.words.length;
    });

    const elapsed = Date.now() - startTime;

    onLog("info", "RAG", `Re-embedding completed for ${docCount} documents`, {
      documentCount: docCount,
      chunkCount: this.chunks.length,
      processingTime: elapsed
    });

    onLog("debug", `RAG`, `Re-embedding completed in ${elapsed}ms`);

    return {
      documentCount: docCount,
      chunkCount: this.chunks.length,
      processingTime: elapsed
    };
  }

  /**
   * Delete a specific document
   * @param {number} docId - Document ID to delete
   * @param {Function} onLog - Logging callback
   * @returns {boolean} Success status
   */
  deleteDocument(docId, onLog = () => {}) {
    if (!this.documents.has(docId)) {
      onLog("error", "RAG", `Document with ID ${docId} not found`);
      return false;
    }

    const docInfo = this.documents.get(docId);
    const chunkCount = this.chunks.filter(c => c.docId === docId).length;

    // Remove document and its chunks
    this.documents.delete(docId);
    this.chunks = this.chunks.filter(c => c.docId !== docId);

    onLog("info", "RAG", `Document "${docInfo.name}" deleted (${chunkCount} chunks)`, {
      docId,
      docName: docInfo.name,
      chunkCount
    });

    return true;
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
export default memoryManager;
