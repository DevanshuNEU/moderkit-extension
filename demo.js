/**
 * ModerKit Demo - Core functionality showcase
 * This file demonstrates the key features of the ModerKit extension
 */

// Background Service Worker - Main coordinator
class ModerKitBackground {
  constructor() {
    this.memoryService = null;
    this.moderationCache = new Map();
    this.init();
  }

  async init() {
    console.log('🛡️ ModerKit Background Service initialized');
    await this.initializeMemoryService();
    this.setupEventListeners();
  }

  async analyzeContent(contentData) {
    const { text, url, context } = contentData;
    
    // Multi-model analysis
    const analysis = {
      toxicity: this.calculateToxicityScore(text),
      spam: this.calculateSpamScore(text),
      sentiment: this.analyzeSentiment(text),
      timestamp: Date.now(),
      recommendations: []
    };

    // Generate contextual recommendations
    if (analysis.toxicity > 0.7) {
      analysis.recommendations.push({
        type: 'warning',
        message: 'High toxicity detected - review recommended',
        action: 'flag_for_review'
      });
    }

    // Store in memory for learning
    await this.memoryService?.storeMemory({
      type: 'content_analysis',
      content: analysis,
      context: { url, domain: new URL(url).hostname }
    });

    return analysis;
  }

  calculateToxicityScore(text) {
    // Simplified toxicity detection
    const toxicPatterns = [
      /hate|stupid|idiot|kill/gi,
      /racist|sexist|homophobic/gi
    ];
    
    let score = 0;
    toxicPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 0.3;
    });
    
    return Math.min(score, 1.0);
  }

  calculateSpamScore(text) {
    // Simplified spam detection
    const spamPatterns = [
      /click here|free money|buy now/gi,
      /urgent|guaranteed|limited time/gi
    ];
    
    let score = 0;
    spamPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 0.25;
    });
    
    return Math.min(score, 1.0);
  }

  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'love', 'awesome'];
    const negativeWords = ['bad', 'hate', 'terrible', 'awful'];
    
    const words = text.toLowerCase().split(/\s+/);
    let sentiment = 'neutral';
    
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    return sentiment;
  }
}

// Content Script - Injected into web pages
class ModerKitContentScript {
  constructor() {
    this.observedElements = new Set();
    this.moderationOverlays = new Map();
    this.init();
  }

  init() {
    console.log('🔍 ModerKit Content Script active on:', window.location.href);
    this.scanExistingContent();
    this.setupMutationObserver();
  }

  async scanExistingContent() {
    const textElements = this.findTextElements();
    for (const element of textElements) {
      await this.analyzeElement(element);
    }
  }

  findTextElements() {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      node => this.isTextElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    );

    let node;
    while (node = walker.nextNode()) {
      elements.push(node);
    }
    
    return elements;
  }

  isTextElement(element) {
    const textContent = element.textContent?.trim();
    if (!textContent || textContent.length < 10) return false;
    
    const tagName = element.tagName.toLowerCase();
    const contentTags = ['p', 'div', 'span', 'article', 'h1', 'h2', 'h3'];
    
    return contentTags.includes(tagName);
  }

  async analyzeElement(element) {
    const text = element.textContent.trim();
    if (text.length < 10) return;

    this.observedElements.add(element);

    try {
      // Simulate sending to background for analysis
      const analysis = await this.requestContentAnalysis(text);
      this.processAnalysisResult(element, analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }

  async requestContentAnalysis(text) {
    // Simulate background communication
    return new Promise(resolve => {
      setTimeout(() => {
        const mockAnalysis = {
          toxicity: Math.random() * 0.3, // Low toxicity for demo
          spam: Math.random() * 0.2,
          sentiment: 'neutral',
          recommendations: []
        };
        
        // Add warning for demo content
        if (text.toLowerCase().includes('example toxic content')) {
          mockAnalysis.toxicity = 0.8;
          mockAnalysis.recommendations.push({
            type: 'warning',
            message: 'High toxicity detected'
          });
        }
        
        resolve(mockAnalysis);
      }, 50);
    });
  }

  processAnalysisResult(element, analysis) {
    const { toxicity, spam, recommendations } = analysis;
    
    if (toxicity > 0.6 || spam > 0.6) {
      this.createModerationOverlay(element, analysis);
    }
    
    if (toxicity > 0.4) {
      this.addVisualIndicator(element, 'moderate');
    }
  }

  createModerationOverlay(element, analysis) {
    const overlay = document.createElement('div');
    overlay.className = 'moderkit-overlay';
    overlay.style.cssText = `
      position: absolute;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #ff6b6b;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui;
      font-size: 14px;
      max-width: 300px;
    `;
    
    overlay.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="margin-right: 8px;">⚠️</span>
        <strong>Content Analysis</strong>
      </div>
      <div style="margin-bottom: 8px;">
        Toxicity: ${Math.round(analysis.toxicity * 100)}%<br>
        Spam: ${Math.round(analysis.spam * 100)}%
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #4CAF50; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Approve
        </button>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Flag
        </button>
      </div>
    `;
    
    // Position overlay
    const rect = element.getBoundingClientRect();
    overlay.style.left = `${rect.right + 10}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    
    document.body.appendChild(overlay);
    this.moderationOverlays.set(element, overlay);
    
    // Auto-remove after 10 seconds
    setTimeout(() => overlay.remove(), 10000);
  }

  addVisualIndicator(element, level) {
    const color = level === 'high' ? '#ff4444' : '#ff8800';
    element.style.outline = `2px solid ${color}`;
    element.style.outlineOffset = '2px';
  }

  setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textElements = this.findTextElements(node);
            textElements.forEach(el => this.analyzeElement(el));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Memory Service - Persistent learning
class MemoryService {
  constructor() {
    this.memoryStore = new Map();
    this.learningPatterns = new Map();
  }

  async storeMemory(data) {
    const memoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      timestamp: Date.now()
    };
    
    this.memoryStore.set(memoryEntry.id, memoryEntry);
    this.updateLearningPatterns(memoryEntry);
    
    console.log('🧠 Memory stored:', memoryEntry.type);
    return memoryEntry.id;
  }

  async retrieveMemory(query) {
    const results = Array.from(this.memoryStore.values())
      .filter(entry => this.matchesQuery(entry, query))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, query.limit || 10);
    
    return results;
  }

  matchesQuery(entry, query) {
    if (query.type && entry.type !== query.type) return false;
    if (query.domain && entry.context?.domain !== query.domain) return false;
    return true;
  }

  updateLearningPatterns(memoryEntry) {
    const domain = memoryEntry.context?.domain || 'unknown';
    const pattern = `${memoryEntry.type}_${domain}`;
    
    if (!this.learningPatterns.has(pattern)) {
      this.learningPatterns.set(pattern, { count: 0, lastSeen: 0 });
    }
    
    const patternData = this.learningPatterns.get(pattern);
    patternData.count++;
    patternData.lastSeen = Date.now();
  }

  getInsights() {
    return {
      totalMemories: this.memoryStore.size,
      patterns: this.learningPatterns.size,
      recentActivity: Array.from(this.memoryStore.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    };
  }
}

// Demo initialization
console.log('🛡️ ModerKit Demo loaded - showcasing AI content moderation with memory');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ModerKitBackground,
    ModerKitContentScript,
    MemoryService
  };
}