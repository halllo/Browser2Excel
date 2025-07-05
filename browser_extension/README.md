# Element Detector Extension

A Chrome/Edge browser extension that detects HTML elements using configurable CSS selectors, highlights them visually, and lists them in the extension popup.

## Features

- 🔍 **Auto-detection**: Automatically scans the current page for elements using your configured CSS selector
- ⚙️ **Configurable selector**: Set any CSS selector (classes, IDs, attributes, etc.) to detect different elements
- 🎯 **Visual highlighting**: Highlights detected elements with orange outline
- 📊 **Element information**: Shows information for each detected element
- 🖱️ **Interactive highlighting**: Click to highlight specific elements and scroll to them
- 💾 **Persistent settings**: Your selector preference is saved across browser sessions
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

1. Navigate to any webpage you want to analyze
2. Click the Element Detector extension icon in your browser toolbar
3. **Configure the selector** (optional):
   - In the popup, you'll see the current CSS selector being used
   - Click in the input field to enter a custom CSS selector
   - Examples: `.product-item`, `div[data-product]`, `article.post`, `#main .item`
   - Click "Save" to apply your custom selector, or "Reset" to return to default
4. The popup will show all detected elements matching your selector
5. Click the "Highlight" button next to any element to focus on it
6. Elements are automatically outlined in orange when detected

## CSS Selector Examples

- **Classes**: `.my-class`, `.product-card`, `.item`
- **IDs**: `#header`, `#main-content`
- **Attributes**: `[data-item]`, `[data-product="true"]`
- **Element + Class**: `div.card`, `article.post`
- **Complex selectors**: `#main .product-item`, `.container > .card`

## Files Structure

```text
browser_extension/
├── manifest.json     # Extension configuration
├── popup.html        # Extension popup interface
├── popup.js          # Popup functionality
├── content.js        # Page content analysis
├── config.js         # Shared configuration (selectors, colors)
├── background.js     # Background script
└── icon.svg          # Extension icon
```

## Development

To modify the extension:

1. Make changes to the source files
2. Go to the extensions page in your browser
3. Click the refresh icon for the "Element Detector" extension
4. Test your changes

### Customizing Default Selector

To change the default CSS selector, edit the `DEFAULT_SELECTOR` value in `config.js`:

```javascript
const CONFIG = {
  DEFAULT_SELECTOR: 'your-custom-selector-here',
  // ...
};
```

## Browser Support

- ✅ Chrome (Manifest V3)
- ✅ Edge (Manifest V3)
- ✅ Other Chromium-based browsers

## Permissions

- `scripting`: To inject content scripts for element detection
- `activeTab`: To access the current tab's content
- `storage`: To save user's selector preferences
- `<all_urls>`: To work on all websites
