# ModerKit Setup Guide

## 🔐 Secure API Key Configuration

**IMPORTANT**: For security reasons, the API key is no longer hardcoded in the extension. You must configure it manually.

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (keep it secure!)

### Step 2: Configure the Extension

**Option A: Via Extension Options (Recommended)**
1. Install the extension in Chrome
2. Right-click the ModerKit icon → "Options"
3. Paste your API key in the settings
4. Click "Save"

**Option B: Via Browser Console (Advanced)**
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Run this command:
```javascript
chrome.runtime.sendMessage({
  type: 'SET_API_KEY', 
  data: { apiKey: 'YOUR_API_KEY_HERE' }
});
```

### Step 3: Verify Setup

1. Click the ModerKit extension icon
2. Try analyzing a page
3. Check console for "API key loaded from storage" message

## 🛡️ Security Features

- ✅ **No hardcoded API keys** - All keys stored securely in browser storage
- ✅ **Local storage only** - API key never leaves your browser
- ✅ **Fallback analysis** - Extension works without API key using pattern matching
- ✅ **Rate limiting** - Protects against quota exceeded errors

## 🔧 Installation

1. **Download/Clone Repository**
   ```bash
   git clone https://github.com/DevanshuNEU/moderkit-extension.git
   cd moderkit-extension
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `moderkit-extension` folder

3. **Configure API Key** (follow steps above)

4. **Test Extension**
   - Open any webpage or `demo.html`
   - Click ModerKit icon → "Refresh Analysis"
   - Look for colored overlays on content

## 🚨 Troubleshooting

**No AI Analysis Working?**
- Check if API key is configured correctly
- Extension will fall back to pattern analysis
- Look for console messages about API key status

**Extension Not Loading?**
- Check `chrome://extensions/` for error messages
- Ensure all files are present in the folder
- Try reloading the extension

**Security Alert Fixed?**
- The exposed API key has been removed from the codebase
- GitHub security alert should resolve automatically
- All new API keys must be configured manually

## 📱 Production Use

For production deployment:
1. Configure API key through extension options
2. Never commit API keys to version control
3. Use environment-specific configurations
4. Monitor API usage and rate limits

---

**🛡️ Security First**: This extension prioritizes security by never storing API keys in code and providing fallback functionality when keys are unavailable.
