# E-Ink Image Converter

A client-side web app that converts images for e-ink displays. Upload photos, and it will resize, dither, and export them as BMP files ready for your e-ink screen.

Runs entirely in the browser — no server required.

## Features

- **Multiple image upload** — drag-and-drop or file picker (JPG, PNG, BMP)
- **Auto orientation detection** — landscape (800×480) or portrait (480×800)
- **Resize modes** — scale-to-fill with white background, or crop-to-fit
- **Floyd-Steinberg dithering** — error diffusion for clean black & white output
- **BMP export** — custom encoder for full compatibility with e-ink displays
- **Settings persistence** — preferences saved to localStorage

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Tests

```bash
npm test
```

## Stack

- Svelte 5
- Vite
- Vanilla CSS (dark theme)
- Canvas API for image processing
