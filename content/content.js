/**
 * ModerKit Content Script - Production Version
 * Professional content moderation with AI analysis
 */

console.log('ModerKit Content Script - Production version loaded');

// EARLY DEBUG: Confirm function is available
console.log('window.markElementSafe defined:', typeof window.markElementSafe);

// Global function for marking elements safe - DEFINE EARLY
window.markElementSafe = function(elementId) {
  console.log('Marking element safe:', elementId);
  
  // Find the element with matching ID (camelCase dataset becomes kebab-case in HTML)
  const targetElement = document.querySelector(`[data-moderkit-id="${elementId}"]`);
  
  if (targetElement) {
    console.log('Found target element, clearing styling...');
    
    // Clear all visual indicators
    targetElement.style.outline = '';
    targetElement.style.outlineOffset = '';
    targetElement.style.backgroundColor = '';
    targetElement.style.boxShadow = '';
    targetElement.style.cursor = '';
    targetElement.style.borderRadius = '';
    targetElement.style.transition = '';
    targetElement.style.transform = '';
    targetElement.style.zIndex = '';
    targetElement.title = '';
    
    // Remove data attributes
    delete targetElement.dataset.moderkit;
    delete targetElement.dataset.moderkitSeverity;
    delete targetElement.dataset.moderkitId;
    
    // Remove from overlay tracking if available
    if (typeof overlayElements !== 'undefined') {
      overlayElements.delete(targetElement);
    }
    
    // Add a green "safe" pulse to show it was marked safe
    targetElement.style.transition = 'box-shadow 0.3s ease';
    targetElement.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.8)';
    
    setTimeout(() => {
      targetElement.style.boxShadow = '';
      targetElement.style.transition = '';
    }, 2000);
    
    // Update stats - move from flagged to approved
    if (typeof flagged !== 'undefined' && flagged > 0) {
      flagged--;
      approved++;
      if (typeof updateBackgroundStats === 'function') {
        updateBackgroundStats();
      }
    }
    
    console.log('Element marked as safe by user');
  } else {
    console.error('Target element not found for ID:', elementId);
    console.log('Available elements with data-moderkit-id:', document.querySelectorAll('[data-moderkit-id]'));
  }
  
  // Remove the popup
  document.querySelectorAll('.moderkit-popup').forEach(popup => {
    if (popup.dataset.targetElement === elementId) {
      popup.remove();
      if (typeof overlayElements !== 'undefined') {
        overlayElements.delete(popup);
      }
    }
  });
};

// Global state management
let analyzed = 0;
let flagged = 0;
let approved = 0;
let isAnalyzing = false;
let processedElements = new WeakSet();
let overlayElements = new Set();
let mutationObserver = null;

// Initialize the content script
function initialize() {
  console.log('Initializing ModerKit content script...');
  
  try {
    setupMessageListener();
    setupMutationObserver();
    
    setTimeout(() => {
      if (document.readyState === 'complete') {
        startAnalysis();
      } else {
        document.addEventListener('DOMContentLoaded', startAnalysis);
        window.addEventListener('load', startAnalysis);
      }
    }, 500);
    
    console.log('ModerKit initialization complete');
  } catch (error) {
    console.error('ModerKit initialization failed:', error);
  }
}

// Setup message listener for popup communication
function setupMessageListener() {
  if (chrome.runtime.onMessage.hasListeners()) {
    chrome.runtime.onMessage.removeListener(handleMessage);
  }
  
  chrome.runtime.onMessage.addListener(handleMessage);
  
  function handleMessage(message, sender, sendResponse) {
    console.log('Content script received:', message.type);
    
    try {
      switch (message.type) {
        case 'REFRESH_ANALYSIS':
          refreshAnalysis();
          sendResponse({ success: true });
          return true;
          
        case 'CLEAR_OVERLAYS':
          clearAllOverlays();
          sendResponse({ success: true });
          return true;
          
        case 'GET_PAGE_STATS':
          sendResponse({ 
            success: true, 
            stats: { analyzed, flagged, approved }
          });
          return true;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          return true;
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  }
}

// Setup mutation observer for dynamic content
function setupMutationObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  
  mutationObserver = new MutationObserver((mutations) => {
    console.log('Mutation detected, checking for new content...');
    
    let newElements = [];
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const elements = extractTextElementsFromNode(node);
          newElements.push(...elements);
        }
      });
      
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        const parentElement = mutation.target.parentElement;
        if (isValidTextElement(parentElement) && !processedElements.has(parentElement)) {
          newElements.push(parentElement);
        }
      }
    });
    
    if (newElements.length > 0) {
      console.log(`Found ${newElements.length} new elements for analysis`);
      analyzeElementsBatch(newElements);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  console.log('Mutation observer active for dynamic content detection');
}

// Extract text elements from a node
function extractTextElementsFromNode(node) {
  const elements = [];
  
  if (isValidTextElement(node)) {
    elements.push(node);
  }
  
  const selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'li', 'td', 'blockquote'];
  
  selectors.forEach(selector => {
    node.querySelectorAll?.(selector)?.forEach(el => {
      if (isValidTextElement(el)) {
        elements.push(el);
      }
    });
  });
  
  return [...new Set(elements)];
}

// Check if element is valid for analysis
function isValidTextElement(element) {
  if (!element || !element.textContent) return false;
  
  const text = element.textContent.trim();
  if (!text || text.length < 15 || text.length > 2000) return false;
  
  if (processedElements.has(element)) return false;
  
  const directTextLength = Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .reduce((length, node) => length + node.textContent.trim().length, 0);
  
  return directTextLength > 10;
}

// Main analysis function
async function startAnalysis() {
  if (isAnalyzing) {
    console.log('Analysis already in progress, skipping...');
    return;
  }
  
  isAnalyzing = true;
  console.log('Starting comprehensive content analysis...');
  
  try {
    analyzed = 0;
    flagged = 0;
    approved = 0;
    
    clearAllOverlaysInternal();
    
    const elements = findAllTextElements();
    console.log(`Found ${elements.length} elements to analyze`);
    
    if (elements.length === 0) {
      showNotification('No analyzable content found on this page', 'info');
      return;
    }
    
    await analyzeElementsBatch(elements);
    updateBackgroundStats();
    showCompletionMessage();
    
    console.log(`Analysis complete: ${analyzed} analyzed, ${flagged} flagged, ${approved} approved`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    showNotification('Analysis failed - please try again', 'error');
  } finally {
    isAnalyzing = false;
  }
}

// Find all text elements on the page
function findAllTextElements() {
  const elements = [];
  const selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'li', 'td', 'blockquote', 'article', 'section'];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      if (isValidTextElement(element)) {
        elements.push(element);
      }
    });
  });
  
  console.log(`Found ${elements.length} valid text elements`);
  return elements;
}

// Analyze elements in batches with parallel processing
async function analyzeElementsBatch(elements) {
  const BATCH_SIZE = 10;
  
  console.log(`Starting parallel analysis of ${elements.length} elements`);
  
  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(element => analyzeElementWithAI(element)));
    
    const progress = Math.round((i + batch.length) / elements.length * 100);
    console.log(`Progress: ${progress}% (${i + batch.length}/${elements.length})`);
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log('Parallel analysis complete');
}

// Analyze single element with AI
async function analyzeElementWithAI(element) {
  if (processedElements.has(element)) return;
  
  const text = element.textContent.trim();
  analyzed++;
  processedElements.add(element);

  const quickAnalysis = getQuickAnalysis(text);
  const flagLevel = determineFlagLevel(quickAnalysis);
  
  if (flagLevel === 'HIGH') {
    flagged++;
    addVisualFlag(element, quickAnalysis, 'red');
  } else if (flagLevel === 'MEDIUM') {
    flagged++;
    addVisualFlag(element, quickAnalysis, 'orange');
  } else {
    approved++;
    addApprovalPulse(element);
  }

  enhanceWithAI(element, text, quickAnalysis).catch(() => {
    console.log('AI enhancement failed for element, using quick analysis');
  });
}

// Quick local analysis for immediate feedback
function getQuickAnalysis(text) {
  const lowerText = text.toLowerCase();
  
  const highToxicPatterns = [
    /\b(kill|die|murder|hate|racist|nazi|terrorist|kys)\b/gi,
    /\b(f[u*]ck|sh[i*]t|b[i*]tch|damn|hell)\b/gi,
    /\b(stupid|idiot|moron|retard|loser)\b/gi
  ];
  
  const mediumPatterns = [
    /\b(dumb|annoying|ugly|weird|gross)\b/gi,
    /\b(click here|buy now|free money|limited time|act now)\b/gi,
    /\b(urgent|guaranteed|don't miss|exclusive offer)\b/gi
  ];

  let highScore = 0;
  let mediumScore = 0;
  const issues = [];

  highToxicPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      highScore += matches.length * 0.8;
      issues.push(`high-severity: ${matches.join(', ')}`);
    }
  });

  mediumPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      mediumScore += matches.length * 0.6;
      issues.push(`medium-severity: ${matches.join(', ')}`);
    }
  });

  return {
    toxicity: Math.min(highScore, 1.0),
    spam: Math.min(mediumScore, 1.0),
    highSeverity: highScore > 0.5,
    mediumSeverity: mediumScore > 0.4,
    confidence: 0.85,
    primaryIssues: issues,
    reasoning: 'Quick pattern analysis',
    aiProvider: 'quick-scan',
    timestamp: Date.now(),
    originalText: text.substring(0, 100)
  };
}

// Determine flag level
function determineFlagLevel(analysis) {
  