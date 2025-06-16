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
  if (analysis.highSeverity || analysis.toxicity > 0.7) {
    return 'HIGH';
  } else if (analysis.mediumSeverity || analysis.toxicity > 0.4 || analysis.spam > 0.5) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// Enhance with AI in background
async function enhanceWithAI(element, text, quickAnalysis) {
  try {
    const response = await sendMessageWithTimeout({
      type: 'ANALYZE_CONTENT_AI',
      data: { 
        text: text,
        url: window.location.href,
        elementType: element.tagName.toLowerCase()
      }
    }, 5000);

    if (response.success && response.analysis) {
      updateElementWithEnhancedAnalysis(element, response.analysis);
    }
  } catch (error) {
    console.log('AI enhancement skipped:', error.message);
  }
}

// Send message with timeout
function sendMessageWithTimeout(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Add visual flag to element
function addVisualFlag(element, analysis, flagColor = 'red') {
  const colors = {
    red: {
      outline: '#ff4444',
      background: 'rgba(255, 68, 68, 0.1)',
      shadow: '0 0 8px rgba(255, 68, 68, 0.5)'
    },
    orange: {
      outline: '#ff8c00',
      background: 'rgba(255, 140, 0, 0.1)', 
      shadow: '0 0 8px rgba(255, 140, 0, 0.5)'
    },
    yellow: {
      outline: '#ffd700',
      background: 'rgba(255, 215, 0, 0.1)',
      shadow: '0 0 8px rgba(255, 215, 0, 0.5)'
    }
  };

  const colorScheme = colors[flagColor] || colors.red;
  
  element.style.outline = `3px solid ${colorScheme.outline}`;
  element.style.outlineOffset = '2px';
  element.style.backgroundColor = colorScheme.background;
  element.style.boxShadow = colorScheme.shadow;
  element.style.cursor = 'pointer';
  element.style.borderRadius = '4px';
  element.style.transition = 'all 0.3s ease';
  
  overlayElements.add(element);
  
  const confidence = Math.round((analysis.confidence || 0.5) * 100);
  const toxicity = Math.round((analysis.toxicity || 0) * 100);
  const spam = Math.round((analysis.spam || 0) * 100);
  
  const severityText = flagColor === 'red' ? 'HIGH RISK' : flagColor === 'orange' ? 'MEDIUM RISK' : 'LOW RISK';
  
  element.title = `${severityText} | Confidence: ${confidence}% | Toxicity: ${toxicity}% | Spam: ${spam}%`;
  
  element.dataset.moderkit = JSON.stringify({...analysis, flagColor});
  element.dataset.moderkitSeverity = flagColor;
  
  element.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showAnalysisPopup(element, analysis, flagColor);
  }, { once: false });
  
  element.addEventListener('mouseenter', () => {
    element.style.transform = 'scale(1.02)';
    element.style.zIndex = '1000';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
    element.style.zIndex = '';
  });
  
  console.log(`Flagged (${flagColor.toUpperCase()}): ${element.textContent.substring(0, 50)}...`);
}

// Add approval pulse to element
function addApprovalPulse(element) {
  element.style.transition = 'box-shadow 0.3s ease';
  element.style.boxShadow = '0 0 4px rgba(76, 175, 80, 0.6)';
  
  setTimeout(() => {
    element.style.boxShadow = '';
  }, 1500);
}

// Update element with enhanced AI analysis
function updateElementWithEnhancedAnalysis(element, aiAnalysis) {
  if (!element.dataset.moderkit) return;
  
  try {
    const currentAnalysis = JSON.parse(element.dataset.moderkit);
    const enhancedAnalysis = { ...currentAnalysis, ...aiAnalysis, enhanced: true };
    
    const newFlagLevel = determineFlagLevel(aiAnalysis);
    const currentFlagLevel = element.dataset.moderkitSeverity;
    
    if (newFlagLevel !== currentFlagLevel) {
      const newColor = newFlagLevel === 'HIGH' ? 'red' : newFlagLevel === 'MEDIUM' ? 'orange' : 'yellow';
      updateElementVisuals(element, enhancedAnalysis, newColor);
    }
    
    element.dataset.moderkit = JSON.stringify(enhancedAnalysis);
    element.dataset.moderkitSeverity = newFlagLevel.toLowerCase();
    
    console.log('AI enhanced analysis applied');
  } catch (error) {
    console.log('Failed to update with AI analysis:', error);
  }
}

// Update element visuals
function updateElementVisuals(element, analysis, flagColor) {
  const colors = {
    red: {
      outline: '#ff4444',
      background: 'rgba(255, 68, 68, 0.1)',
      shadow: '0 0 8px rgba(255, 68, 68, 0.5)'
    },
    orange: {
      outline: '#ff8c00',
      background: 'rgba(255, 140, 0, 0.1)', 
      shadow: '0 0 8px rgba(255, 140, 0, 0.5)'
    },
    yellow: {
      outline: '#ffd700',
      background: 'rgba(255, 215, 0, 0.1)',
      shadow: '0 0 8px rgba(255, 215, 0, 0.5)'
    }
  };

  const colorScheme = colors[flagColor] || colors.red;
  
  element.style.outline = `3px solid ${colorScheme.outline}`;
  element.style.backgroundColor = colorScheme.background;
  element.style.boxShadow = colorScheme.shadow;
}

// Show detailed analysis popup
function showAnalysisPopup(element, analysis, flagColor = 'red') {
  document.querySelectorAll('.moderkit-popup').forEach(p => p.remove());
  
  const popup = document.createElement('div');
  popup.className = 'moderkit-popup';
  
  // Create unique identifier for this element-popup pair
  const uniqueId = 'moderkit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  popup.dataset.targetElement = uniqueId;
  element.dataset.moderkitId = uniqueId;
  
  const popupColors = {
    red: '#ff4444',
    orange: '#ff8c00', 
    yellow: '#ffd700'
  };
  
  const borderColor = popupColors[flagColor] || popupColors.red;
  const severityText = flagColor === 'red' ? 'HIGH RISK CONTENT' : flagColor === 'orange' ? 'MEDIUM RISK CONTENT' : 'LOW RISK CONTENT';
  
  popup.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 400px;
    background: white;
    border: 3px solid ${borderColor};
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    z-index: 99999;
    font-family: system-ui;
    font-size: 14px;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideIn 0.3s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  const confidence = Math.round((analysis.confidence || 0.5) * 100);
  const toxicity = Math.round((analysis.toxicity || 0) * 100);
  const spam = Math.round((analysis.spam || 0) * 100);
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: #333; display: flex; align-items: center; gap: 8px;">
        ${severityText}
      </h3>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none; border: none; font-size: 24px; cursor: pointer; color: #999;
        width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      ">×</button>
    </div>
    
    <div style="background: ${flagColor === 'red' ? '#fff5f5' : flagColor === 'orange' ? '#fff8f0' : '#fffef0'}; 
                padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${borderColor};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Confidence:</strong>
        <span style="color: ${confidence > 80 ? '#f44336' : confidence > 60 ? '#ff9800' : '#4CAF50'}; font-weight: 600;">
          ${confidence}%
        </span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Toxicity:</strong>
        <span style="color: ${toxicity > 70 ? '#f44336' : toxicity > 40 ? '#ff9800' : '#4CAF50'}; font-weight: 600;">
          ${toxicity}%
        </span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Spam:</strong>
        <span style="color: ${spam > 70 ? '#f44336' : spam > 40 ? '#ff9800' : '#4CAF50'}; font-weight: 600;">
          ${spam}%
        </span>
      </div>
    </div>
    
    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 12px; color: #666;">
      <strong>Content Preview:</strong><br>
      <div style="margin-top: 8px; font-style: italic; line-height: 1.4;">
        "${element.textContent.substring(0, 200).replace(/"/g, '&quot;')}${element.textContent.length > 200 ? '...' : ''}"
      </div>
    </div>
    
    <div style="display: flex; gap: 10px;">
      <button id="mark-safe-btn-${uniqueId}" style="
        flex: 1; background: #4CAF50; color: white; border: none; 
        padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 500;
      ">Mark Safe</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        flex: 1; background: #f44336; color: white; border: none; 
        padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 500;
      ">Confirm Flag</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  overlayElements.add(popup);
  
  // Add event listener AFTER the popup is added to DOM
  const markSafeBtn = document.getElementById(`mark-safe-btn-${uniqueId}`);
  if (markSafeBtn) {
    markSafeBtn.addEventListener('click', function() {
      window.markElementSafe(uniqueId);
    });
  }
  
  setTimeout(() => {
    if (popup.parentElement) popup.remove();
  }, 20000);
}

// Clear all overlays
function clearAllOverlays() {
  clearAllOverlaysInternal();
  console.log('All overlays cleared');
}

function clearAllOverlaysInternal() {
  console.log('Clearing all ModerKit overlays...');
  
  document.querySelectorAll('.moderkit-popup').forEach(el => {
    el.remove();
  });
  
  overlayElements.forEach(element => {
    if (element && element.style) {
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.backgroundColor = '';
      element.style.boxShadow = '';
      element.style.cursor = '';
      element.style.borderRadius = '';
      element.style.transition = '';
      element.style.transform = '';
      element.style.zIndex = '';
      element.title = '';
      
      delete element.dataset.moderkit;
      delete element.dataset.moderkitSeverity;
    }
  });
  
  overlayElements.clear();
  
  console.log('All overlays cleared');
}

// Refresh analysis
function refreshAnalysis() {
  console.log('Refreshing analysis...');
  
  analyzed = 0;
  flagged = 0;
  approved = 0;
  processedElements = new WeakSet();
  
  clearAllOverlaysInternal();
  
  setTimeout(() => startAnalysis(), 500);
}

// Update background stats
function updateBackgroundStats() {
  try {
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATS',
      data: { analyzed, flagged, approved }
    });
  } catch (error) {
    console.log('Could not update background stats:', error);
  }
}

// Show completion message
function showCompletionMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4285f4, #34a853);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(66, 133, 244, 0.3);
    z-index: 99998;
    font-family: system-ui;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  message.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <strong>Analysis Complete</strong>
    </div>
    <div style="font-size: 13px; opacity: 0.9;">
      Analyzed: ${analyzed} | Flagged: ${flagged} | Approved: ${approved}
    </div>
  `;
  
  document.body.appendChild(message);
  overlayElements.add(message);
  
  setTimeout(() => {
    if (message.parentElement) {
      message.style.transform = 'translateX(100%)';
      message.style.transition = 'transform 0.3s ease';
      setTimeout(() => {
        message.remove();
        overlayElements.delete(message);
      }, 300);
    }
  }, 6000);
}

// Show notification
function showNotification(message, type = 'info') {
  const colors = {
    info: '#2196F3',
    error: '#f44336',
    warning: '#ff9800',
    success: '#4CAF50'
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 99999;
    font-family: system-ui;
    font-size: 14px;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);
  overlayElements.add(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'transform 0.3s ease';
      setTimeout(() => {
        notification.remove();
        overlayElements.delete(notification);
      }, 300);
    }
  }, 4000);
}

// Initialize the script
initialize();

console.log('ModerKit content script loaded and ready');
