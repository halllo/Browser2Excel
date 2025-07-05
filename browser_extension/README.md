# Card Detector Extension

A Chrome/Edge browser extension that detects mkp-card divs on web pages, highlights them visually, and lists them in the extension popup.

## Features

- 🔍 **Auto-detection**: Automatically scans the current page for mkp-card divs
- 🎯 **Visual highlighting**: Highlights detected cards with orange outline
- 📊 **Card information**: Shows information for each detected card
- 🖱️ **Interactive highlighting**: Click to highlight specific cards and scroll to them
- 📱 **Cross-browser**: Works on Chrome and Edge (Manifest V3)

## Installation

### For Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser_extension` folder from this project

### For Edge

1. Open Edge and go to `edge://extensions/`
2. Enable "Developer mode" in the left sidebar
3. Click "Load unpacked"
4. Select the `browser_extension` folder from this project

## Usage

1. Navigate to any webpage with mkp-card divs
2. Click the Card Detector extension icon in your browser toolbar
3. The popup will show all detected cards with their information
4. Click the "Highlight" button next to any card to focus on it
5. Cards are automatically outlined in orange when detected

## Files Structure

```
browser_extension/
├── manifest.json     # Extension configuration
├── popup.html        # Extension popup interface
├── popup.js          # Popup functionality
├── content.js        # Page content analysis
├── background.js     # Background script
└── icon.svg          # Extension icon
```

## Development

To modify the extension:

1. Make changes to the source files
2. Go to the extensions page in your browser
3. Click the refresh icon for the "Card Detector" extension
4. Test your changes

## Browser Support

- ✅ Chrome (Manifest V3)
- ✅ Edge (Manifest V3)
- ✅ Other Chromium-based browsers

## Permissions

- `scripting`: To inject content scripts for card detection
- `activeTab`: To access the current tab's content
- `<all_urls>`: To work on all websites
