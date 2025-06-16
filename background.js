/**
 * ModerKit Background Service - Production Version
 * Professional content moderation API integration
 */

console.log('ModerKit Background Service - Production version starting...');

class ModerKitBackground {
  constructor() {
    this.stats = { analyzed: 0, flagged: 0, approved: 0 };
    this.memoryStore = new Map();
    this.apiKey = null;
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.requestResetTime = Date.now();
    
    this.init();
  }

  async init() {
    console.log('Initializing ModerKit Background...');
    
    try {
      await this.loadApiKey();
      this.setupMessageHandler();
      this.loadStoredData();
      
      // Set initial badge
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
      
      console.log('ModerKit Background ready');
    } catch (error) {
      console.error('Background initialization failed:', error);
    }
  }

  async loadApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['gemini_api_key'], (result) => {
        if (result.gemini_api_key) {
          this.apiKey = result.gemini_api_key;
          console.log('API key loaded from storage');
        } else {
          // No API key configured - user needs to set it in options
          console.warn('No API key configured. Extension will use fallback analysis only.');
          console.log('Please configure your Gemini API key in the extension options.');
        }
        resolve();
      });
    });
  }

  setupMessageHandler() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background received message:', message.type);
      
      this.handleMessage(message, sender, sendResponse).catch(error => {
        console.error('Background message handler error:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true;
    });
    
    console.log('Message handler setup complete');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'ANALYZE_CONTENT_AI':
          try {
            const analysis = await this.analyzeContentWithGemini(message.data);
            sendResponse({ success: true, analysis });
          } catch (error) {
            console.error('Analysis failed, using fallback:', error);
            const fallbackAnalysis = this.getFallbackAnalysis(message.data.text, error.message);
            sendResponse({ success: true, analysis: fallbackAnalysis });
          }
          break;

        case 'UPDATE_STATS':
          this.updateStats(message.data);
          sendResponse({ success: true, stats: this.stats });
          break;

        case 'GET_STATS':
          sendResponse({ success: true, stats: this.stats });
          break;

        case 'STORE_MEMORY':
          const memoryId = await this.storeMemory(message.data);
          sendResponse({ success: true, memoryId });
          break;

        case 'GET_API_STATUS':
          sendResponse({ 
            success: true, 
            hasApiKey: !!this.apiKey,
            rateLimitStatus: this.getRateLimitStatus()
          });
          break;

        case 'SET_API_KEY':
          await this.setApiKey(message.data.apiKey);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async setApiKey(apiKey) {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ gemini_api_key: apiKey });
    console.log('API key updated');
  }

  async analyzeContentWithGemini(data) {
    const { text, url } = data;
    
    if (!this.apiKey) {
      throw new Error('API key not configured - using fallback analysis');
    }

    if (!text || text.length < 10) {
      return this.getDefaultAnalysis(text, 'too_short');
    }

    // Rate limiting check
    const now = Date.now();
    if (now - this.requestResetTime > 60000) {
      this.requestCount = 0;
      this.requestResetTime = now;
    }
    
    if (this.requestCount >= 15) {
      throw new Error('Rate limit exceeded');
    }

    const prompt = this.buildAnalysisPrompt(text);
    const response = await this.callGeminiAPI(prompt);
    const analysis = this.parseGeminiResponse(response, text);
    
    this.requestCount++;
    
    // Store analysis in memory
    await this.storeMemory({
      type: 'ai_analysis',
      content: analysis,
      context: { url, domain: this.extractDomain(url) }
    });

    console.log('AI analysis complete');
    return analysis;
  }

  getRateLimitStatus() {
    const now = Date.now();
    const timeUntilReset = Math.max(0, 60000 - (now - this.requestResetTime));
    
    return {
      requestCount: this.requestCount,
      maxRequests: 15,
      timeUntilReset
    };
  }

  buildAnalysisPrompt(text) {
    return `Analyze this text for inappropriate content. Respond ONLY with valid JSON:

Text: "${text}"

Required JSON format:
{
  "toxicity_score": 0.0,
  "spam_score": 0.0,
  "hate_speech_score": 0.0,
  "should_flag": false,
  "confidence": 0.0,
  "primary_issues": [],
  "reasoning": "Brief explanation",
  "content_type": "normal"
}

Rules:
- toxicity_score: 0.0-1.0 for harmful language
- spam_score: 0.0-1.0 for promotional content
- should_flag: true if any score > 0.6
- confidence: how certain (0.0-1.0)
- primary_issues: array of specific problems found
- Be conservative, flag when uncertain`;
  }

  async callGeminiAPI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid API response format');
    }

    return data.candidates[0].content.parts[0].text;
  }

  parseGeminiResponse(responseText, originalText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const aiAnalysis = JSON.parse(jsonMatch[0]);
      
      return {
        toxicity: Math.min(Math.max(aiAnalysis.toxicity_score || 0, 0), 1),
        spam: Math.min(Math.max(aiAnalysis.spam_score || 0, 0), 1),
        hateSpeech: Math.min(Math.max(aiAnalysis.hate_speech_score || 0, 0), 1),
        shouldFlag: aiAnalysis.should_flag || false,
        confidence: Math.min(Math.max(aiAnalysis.confidence || 0.5, 0), 1),
        primaryIssues: aiAnalysis.primary_issues || [],
        reasoning: aiAnalysis.reasoning || 'AI analysis completed',
        contentType: aiAnalysis.content_type || 'normal',
        aiProvider: 'gemini-1.5-flash',
        timestamp: Date.now(),
        originalText: originalText.substring(0, 100)
      };

    } catch (error) {
      console.error('Failed to parse response:', error);
      throw new Error('Failed to parse AI analysis result');
    }
  }

  getFallbackAnalysis(text, errorReason) {
    console.log('Using fallback analysis due to:', errorReason);
    
    const lowerText = text.toLowerCase();
    
    const toxicPatterns = [
      { pattern: /\b(hate|stupid|idiot|kill|die|dumb|moron)\b/gi, weight: 0.8 },
      { pattern: /\b(racist|sexist|homophobic|nazi|terrorist)\b/gi, weight: 0.9 },
      { pattern: /\b(fuck|shit|damn|hell)\b/gi, weight: 0.3 }
    ];
    
    const spamPatterns = [
      { pattern: /\b(click here|free money|buy now|limited time)\b/gi, weight: 0.7 },
      { pattern: /\b(urgent|guaranteed|act now|don't miss)\b/gi, weight: 0.6 }
    ];

    let toxicityScore = 0;
    let spamScore = 0;
    const primaryIssues = [];

    toxicPatterns.forEach(({ pattern, weight }) => {
      const matches = text.match(pattern);
      if (matches) {
        toxicityScore += matches.length * weight;
        primaryIssues.push(`toxic language: ${matches.join(', ')}`);
      }
    });

    spamPatterns.forEach(({ pattern, weight }) => {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += matches.length * weight;
        primaryIssues.push(`spam indicators: ${matches.join(', ')}`);
      }
    });

    const shouldFlag = toxicityScore > 0.6 || spamScore > 0.6;

    return {
      toxicity: Math.min(toxicityScore, 1.0),
      spam: Math.min(spamScore, 1.0),
      hateSpeech: Math.min(toxicityScore * 0.8, 1.0),
      shouldFlag,
      confidence: 0.8,
      primaryIssues,
      reasoning: `Pattern analysis used (${errorReason}). ${shouldFlag ? 'Flagged based on detected patterns.' : 'No concerning patterns detected.'}`,
      contentType: shouldFlag ? (toxicityScore > spamScore ? 'toxic' : 'spam') : 'normal',
      aiProvider: 'fallback',
      timestamp: Date.now(),
      originalText: text.substring(0, 100)
    };
  }

  getDefaultAnalysis(text, reason) {
    return {
      toxicity: 0,
      spam: 0,
      hateSpeech: 0,
      shouldFlag: false,
      confidence: 0.9,
      primaryIssues: [],
      reasoning: `Skipped analysis: ${reason}`,
      contentType: 'normal',
      aiProvider: 'default',
      timestamp: Date.now(),
      originalText: text
    };
  }

  updateStats(data) {
    this.stats.analyzed += data.analyzed || 0;
    this.stats.flagged += data.flagged || 0;
    this.stats.approved += data.approved || 0;
    
    // Update badge
    chrome.action.setBadgeText({
      text: this.stats.flagged > 0 ? this.stats.flagged.toString() : ""
    });
    chrome.action.setBadgeBackgroundColor({ color: '#ff6b6b' });
    
    this.saveStoredData();
  }

  async storeMemory(data) {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoryEntry = {
      id: memoryId,
      ...data,
      timestamp: Date.now()
    };
    
    this.memoryStore.set(memoryId, memoryId);
    this.saveStoredData();
    
    return memoryId;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['moderkit_stats', 'moderkit_memory']);
      if (result.moderkit_stats) {
        this.stats = { ...this.stats, ...result.moderkit_stats };
      }
      if (result.moderkit_memory) {
        this.memoryStore = new Map(result.moderkit_memory);
      }
    } catch (error) {
      console.error('Failed to load stored data:', error);
    }
  }

  async saveStoredData() {
    try {
      await chrome.storage.local.set({
        moderkit_stats: this.stats,
        moderkit_memory: Array.from(this.memoryStore.entries())
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }
}

// Initialize background service
new ModerKitBackground();
