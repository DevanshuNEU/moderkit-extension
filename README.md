# ModerKit

<div align="center">

**AI-powered content moderation browser extension with real-time analysis**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/DevanshuNEU/moderkit-extension)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/DevanshuNEU/moderkit-extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [Contributing](#contributing)

![ModerKit Demo](https://github.com/DevanshuNEU/moderkit-extension/assets/demo-screenshot.png)

</div>

## What is ModerKit?

ModerKit is a browser extension that automatically detects and flags potentially harmful content on web pages using AI. It helps content moderators, community managers, and online safety professionals identify toxic, spam, or inappropriate content in real-time.

### Key Features

- 🤖 **AI-Powered Analysis** - Uses Google Gemini AI for accurate toxicity detection
- 🎨 **Visual Indicators** - Color-coded overlays (Red: High risk, Orange: Medium risk, Green: Safe)
- ⚡ **Real-Time Processing** - Analyzes content as you browse with parallel processing
- 🎯 **Interactive Moderation** - Click flagged content for detailed analysis and override decisions
- 📊 **Statistics Tracking** - Monitor analysis results across browsing sessions
- 🔄 **Dynamic Content** - Automatically detects and analyzes newly loaded content

## Demo

![ModerKit in Action](https://github.com/DevanshuNEU/moderkit-extension/assets/demo-gif.gif)

**Try it yourself:**
1. Load the extension
2. Visit any content-heavy website (Wikipedia, news sites, forums)
3. Click the ModerKit icon and hit "Refresh Analysis"
4. Watch as content gets automatically flagged with colored overlays

## Installation

### Quick Start

1. **Download the Extension**
   ```bash
   git clone https://github.com/DevanshuNEU/moderkit-extension.git
   cd moderkit-extension
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the `moderkit-extension` folder

3. **Start Using**
   - The ModerKit icon will appear in your browser toolbar
   - Visit any website and click the icon to begin analysis

### Prerequisites

- Chrome Browser (v88+) or any Chromium-based browser
- No additional dependencies required

## Usage

### Basic Operation

1. **Navigate** to any website with text content
2. **Click** the ModerKit extension icon in your toolbar
3. **Press** "Refresh Analysis" to scan the current page
4. **View Results** with color-coded overlays:
   - 🔴 **Red**: High-risk content (toxicity > 70%)
   - 🟠 **Orange**: Medium-risk content (toxicity 40-70%)
   - 🟢 **Green pulse**: Safe content

### Interactive Features

- **Click flagged content** to see detailed analysis
- **Use "Mark Safe"** to override AI decisions
- **View statistics** in the extension popup
- **Clear overlays** to reset the page view

### Configuration

The extension works out-of-the-box with sensible defaults. For advanced configuration:

- Open the extension popup for real-time statistics
- Use the "Clear Overlays" button to remove all visual indicators
- The extension remembers your moderation decisions across sessions

## How It Works

ModerKit uses a two-layer analysis system:

1. **Quick Pattern Detection** - Immediate local analysis for instant feedback
2. **AI Enhancement** - Google Gemini API for detailed toxicity scoring

The extension processes content in parallel batches for optimal performance and includes comprehensive fallback systems for reliability.

## Project Structure

```
moderkit-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker & API integration
├── content/
│   └── content.js         # Page analysis & visual overlays
├── popup/
│   ├── popup.html         # Extension interface
│   └── popup.js           # UI controller
├── assets/
│   └── icons/             # Extension icons
└── demo.html              # Test page for development
```

## Contributing

Contributions are welcome! This project is perfect for developers interested in:

- Browser extension development
- AI/ML integration
- Content moderation tools
- Chrome Extension APIs

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/moderkit-extension.git`
3. Make your changes
4. Test thoroughly with the included `demo.html`
5. Submit a pull request

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/DevanshuNEU/moderkit-extension/issues) with:

- Clear description of the problem
- Steps to reproduce
- Browser version and operating system
- Screenshots if applicable

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Google Gemini AI](https://gemini.google.com/) for content analysis
- Inspired by the need for better online content moderation tools
- Thanks to the open-source community for Chrome Extension best practices

---

<div align="center">

**Built by [Devanshu Chicholikar](https://github.com/DevanshuNEU)**

⭐ Star this repo if you find it useful!

</div>
