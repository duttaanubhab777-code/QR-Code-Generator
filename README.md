# Ultimate QR Code Generator

A versatile, feature-rich QR Code Generator that instantly converts any text or URL into a highly scannable QR code. It runs on phone and desktop, comes with a fully animated gradient interface, flexible quality settings and a unique auto-labeling feature so you never lose track of what your QR code represents.

## ✨ Key Features

*   **Universal Input Support:** Generate QR codes from any website URL, long paragraph or simple text string. Press `Enter` to generate instantly.
*   **Custom Quality Options:** Choose the resolution from 100x100 up to 1000x1000 (low for quick sharing, high for printing).
*   **QR Color Themes:** Pick from five dark, high-contrast colors. The QR code updates live when you change color or quality.
*   **PNG Export:** Download your QR code in high-quality `.png` format, with a white margin (quiet zone) so it scans reliably.
*   **Share Button:** On supported phones and browsers, a Share button sends the finished PNG straight to any app.
*   **Smart Auto-Labeling (Identifier):** The downloaded image automatically includes the source URL or text at the bottom, so you can identify the destination without scanning it first.
*   **High Error Correction:** QR codes are generated at the highest error-correction level (H), so they still scan when slightly damaged or dirty.

## 🎬 Design & Animation

*   Animated aurora gradient background with floating blobs and a moving perspective grid.
*   Interactive particle network that reacts to your cursor or finger, with a particle burst when a QR code is generated.
*   Glass card with a rotating gradient border, 3D tilt (mouse or touch drag), floating motion and a light sheen.
*   Letter-by-letter animated gradient title and a typewriter placeholder in the input.
*   Glowing input focus with an animated underline, plus a clear button.
*   Flowing gradient Generate button, ripple effect on every button, and animated scan-line with pulsing corner brackets when the QR appears.
*   Toast notifications instead of browser alerts, and a shake animation on invalid input.
*   Fully responsive for small phones up to large desktops, safe-area aware for notched phones.
*   Respects `prefers-reduced-motion`: users who turn animations off in their system settings get a calm version.
*   Animations pause when the tab is hidden to save battery.

## 🚀 How It Works
1. Enter your desired URL or text into the input field.
2. Select your preferred image quality/resolution and QR color.
3. Click **Generate** to view your QR code.
4. Hit **Download**! The saved PNG will feature your QR code with the source text/URL displayed at the bottom.
5. On supported devices, tap **Share** to send the image directly to another app.

## 🛠️ Tech Stack
*   HTML5, CSS3 (gradients, `@property`, keyframe animations, `backdrop-filter`)
*   Vanilla JavaScript (Canvas API for particles and PNG export)
*   [qrcodejs](https://www.npmjs.com/package/qrcodejs) loaded from jsDelivr CDN (internet needed on first load)

## 📁 Project Structure
```
index.html   → page markup
qrcode.css   → styles and animations
qrcode.js    → QR logic, particles, tilt, toasts
README.md    → this file
```

## ▶️ Run Locally
No build step needed. Open `index.html` in any modern browser, or host the folder on GitHub Pages.

## 🌐 Browser Support
Latest Chrome, Edge, Safari and Firefox. The rotating gradient border uses CSS `@property`; on older browsers it simply shows a static gradient border.

## 👤 Credits
Created by Anubhab Dutta.

