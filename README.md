# ModerKit Browser Extension

> AI-powered content moderation with persistent memory - Built for the future of browser-based AI workflows

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://github.com/DevanshuNEU/moderkit-extension)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blue.svg)](https://github.com/DevanshuNEU/moderkit-extension)
[![Memory Layer](https://img.shields.io/badge/Memory-Layer-orange.svg)](https://github.com/DevanshuNEU/moderkit-extension)

## 🚀 Overview

ModerKit transforms your browser into an intelligent content moderation workspace. It combines real-time AI analysis with persistent memory to create context-aware moderation across all your browsing sessions.

**Key Features:**
- 🧠 **Persistent Memory**: Remembers moderation patterns and user preferences across sessions
- ⚡ **Real-time Analysis**: Instant content evaluation as you browse
- 🎯 **Smart Overlays**: Non-intrusive UI that enhances familiar interfaces  
- 🔧 **Extensible**: Built for developers who understand AI workflow automation

## 🎯 Perfect For

- **Content Moderators**: Streamline review workflows with AI assistance
- **Community Managers**: Maintain consistent moderation across platforms
- **Developers**: Example of browser extension + memory layer integration
- **AI Enthusiasts**: See how persistent context enhances user experience

## 🚀 Quick Start

### Prerequisites
- Chrome Browser (v88+)
- Basic understanding of browser extensions

### Installation

1. **Load Extension**
   - Open Chrome → Extensions → Developer Mode (ON)
   - Click "Load unpacked" → Select moderkit-extension folder
   - Extension icon appears in toolbar

2. **First Run**
   - Click ModerKit icon → Follow setup wizard
   - Grant necessary permissions for full functionality

## 🧠 Memory Layer Integration

ModerKit uses Mem0 MCP (Model Context Protocol) for persistent memory:

```javascript
// Example: Remembering moderation patterns
const memoryService = new MemoryService();
await memoryService.remember('user_preference', {
  strictness: 'medium',
  categories: ['spam', 'harassment'],
  context: 'social_media_platform'
});
```

## 🛠️ Development

### Project Structure
```
moderkit-extension/
├── manifest.json           # Chrome extension configuration
├── background.js           # Service worker for cross-tab coordination
├── content/               # Content scripts injected into web pages
├── popup/                # Extension popup interface  
├── memory/               # Memory layer integration (Mem0 MCP)
├── moderation/           # AI content analysis engine
├── utils/                # Shared utilities and storage
└── assets/              # Icons and styling
```

### Key Components

1. **Background Service Worker**
   - Coordinates between tabs
   - Manages persistent connections
   - Handles memory storage

2. **Content Scripts**
   - Analyze page content in real-time
   - Inject moderation overlays
   - Communicate with background worker

3. **Memory Layer**
   - Persistent context across sessions
   - Learning from moderation decisions
   - Smart suggestions based on history

## 🌟 Why This Matters

This extension showcases the future of browser-based AI:

1. **Context Awareness**: AI that remembers and learns from your workflows
2. **Seamless Integration**: Enhancement rather than replacement of existing interfaces  
3. **Cross-Session Intelligence**: Memory that persists beyond single browsing sessions
4. **Developer-Friendly**: Clean architecture for building similar AI-enhanced tools

## 🎯 Built For

This extension was built to demonstrate browser-based AI capabilities, specifically:
- Persistent memory integration in browser extensions
- Real-time content analysis workflows
- Clean architecture for AI-enhanced browser tools
- Modern development practices for extension building

Perfect example for companies building browser-based AI copilots and intelligent browsing experiences.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by Devanshu Chicholikar**  
*Full-Stack Engineer passionate about AI-enhanced browser experiences*