/**
 * ModerKit Popup Controller - Production Version
 * Professional interface for content moderation extension
 */

console.log('ModerKit Popup - Production version loaded');

class ModerKitPopup {
  constructor() {
    this.stats = { analyzed: 0, flagged: 0, approved: 0 };
    this.currentTab = null;
    this.init();
  }

  init() {
    this.getCurrentTab();
    this.setupButtons();
    this.loadStats();
    this.updateUI();
  }

  getCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      this.currentTab = tabs[0];
      this.updatePageUrl();
    });
  }

  updatePageUrl() {
    const urlElement = document.getElementById('current-url');
    if (this.currentTab && urlElement) {
      try {
        const url = new URL(this.currentTab.url);
        urlElement.textContent = url.hostname;
      } catch {
        urlElement.textContent = 'Current page';
      }
    }
  }

  setupButtons() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshAnalysis();
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => this.clearOverlays();
    }
  }

  loadStats() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Background not ready, using default stats');
          return;
        }
        
        if (response && response.success) {
          this.stats = response.stats;
          this.updateUI();
        }
      });
    } catch (error) {
      console.log('Stats loading failed, using defaults');
    }
  }

  refreshAnalysis() {
    if (!this.currentTab) {
      this.showStatus('No active tab', 'error');
      return;
    }

    this.showStatus('Starting analysis...', 'info');
    this.setButtonLoading(true);

    chrome.tabs.sendMessage(this.currentTab.id, { type: 'REFRESH_ANALYSIS' }, (response) => {
      this.setButtonLoading(false);
      
      if (chrome.runtime.lastError) {
        this.injectAndAnalyze();
      } else if (response && response.success) {
        this.showStatus('Analysis complete', 'success');
        setTimeout(() => this.loadStats(), 2000);
      } else {
        this.showStatus('Analysis failed', 'error');
      }
    });
  }

  injectAndAnalyze() {
    chrome.scripting.executeScript({
      target: { tabId: this.currentTab.id },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        this.showStatus('Cannot analyze this page type', 'error');
        return;
      }

      setTimeout(() => {
        chrome.tabs.sendMessage(this.currentTab.id, { type: 'REFRESH_ANALYSIS' }, (response) => {
          if (response && response.success) {
            this.showStatus('Analysis complete', 'success');
            setTimeout(() => this.loadStats(), 2000);
          } else {
            this.showStatus('Analysis started', 'success');
          }
        });
      }, 1000);
    });
  }

  clearOverlays() {
    if (!this.currentTab) {
      this.showStatus('No active tab', 'error');
      return;
    }

    chrome.tabs.sendMessage(this.currentTab.id, { type: 'CLEAR_OVERLAYS' }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          func: this.clearOverlaysDirectly
        }, () => {
          this.showStatus('Overlays cleared', 'success');
        });
      } else {
        this.showStatus('Overlays cleared', 'success');
      }
    });
  }

  clearOverlaysDirectly() {
    document.querySelectorAll('*').forEach(element => {
      const style = element.style;
      if (style.outline && (style.outline.includes('#ff4444') || style.outline.includes('#ff8c00') || style.outline.includes('#ffd700'))) {
        style.outline = '';
        style.outlineOffset = '';
        style.backgroundColor = '';
        style.animation = '';
        style.boxShadow = '';
        style.cursor = '';
        style.borderRadius = '';
        style.transition = '';
        style.transform = '';
        style.zIndex = '';
        element.title = '';
        delete element.dataset.moderkit;
        delete element.dataset.moderkitSeverity;
      }
    });
    
    document.querySelectorAll('.moderkit-popup, [class*="moderkit"]').forEach(el => {
      el.remove();
    });
    
    console.log('Overlays cleared directly');
  }

  setButtonLoading(loading) {
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const refreshText = document.getElementById('refresh-text');
    
    if (refreshBtn && refreshIcon && refreshText) {
      if (loading) {
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.6';
        refreshIcon.textContent = '⏳';
        refreshText.textContent = 'Analyzing...';
      } else {
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
        refreshIcon.textContent = '🔄';
        refreshText.textContent = 'Refresh Analysis';
      }
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('footer-text');
    if (!statusEl) return;

    const colors = {
      success: '#4CAF50',
      error: '#ff6b6b', 
      info: '#2196F3'
    };

    statusEl.textContent = message;
    statusEl.style.color = colors[type] || '';

    setTimeout(() => {
      statusEl.style.color = '';
      statusEl.textContent = 'Ready to analyze content';
    }, 3000);
  }

  updateUI() {
    const elements = {
      'analyzed-count': this.stats.analyzed,
      'flagged-count': this.stats.flagged,
      'approved-count': this.stats.approved,
      'page-analyzed': this.stats.analyzed,
      'page-flagged': this.stats.flagged
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value.toString();
    });
  }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ModerKitPopup());
} else {
  new ModerKitPopup();
}

console.log('ModerKit popup ready');
