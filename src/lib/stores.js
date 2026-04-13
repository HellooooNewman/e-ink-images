import { writable } from 'svelte/store'

const SETTINGS_KEY = 'eink-settings'

export const DISPLAY_PRESETS = [
  { id: '7.5in-waveshare', label: '7.5″ Waveshare', width: 800, height: 480 },
  { id: '5.83in-waveshare', label: '5.83″ Waveshare', width: 648, height: 480 },
  { id: '4.2in-waveshare', label: '4.2″ Waveshare', width: 400, height: 300 },
  { id: '2.9in-waveshare', label: '2.9″ Waveshare', width: 296, height: 128 },
  { id: '2.13in-waveshare', label: '2.13″ Waveshare', width: 250, height: 122 },
  { id: '10.3in-remarkable', label: '10.3″ reMarkable', width: 1404, height: 1872 },
  { id: '6in-kindle', label: '6″ Kindle', width: 1024, height: 758 },
  { id: '6.8in-kindle-pw', label: '6.8″ Kindle Paperwhite', width: 1236, height: 1648 },
  { id: 'custom', label: 'Custom', width: 800, height: 480 },
]

export const COLOR_PALETTES = [
  {
    id: 'bw',
    label: 'Black & White',
    colors: [[0, 0, 0], [255, 255, 255]],
  },
  {
    id: '4-gray',
    label: '4-Level Grayscale',
    colors: [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]],
  },
  {
    id: 'bwr',
    label: 'Black, White, Red',
    colors: [[0, 0, 0], [255, 255, 255], [200, 0, 0]],
  },
  {
    id: 'bwy',
    label: 'Black, White, Yellow',
    colors: [[0, 0, 0], [255, 255, 255], [255, 220, 0]],
  },
  {
    id: '7-color',
    label: '7-Color',
    colors: [
      [0, 0, 0],       // black
      [255, 255, 255],  // white
      [0, 128, 0],      // green
      [0, 0, 200],      // blue
      [200, 0, 0],      // red
      [255, 220, 0],    // yellow
      [255, 140, 0],    // orange
    ],
  },
]

const defaultSettings = {
  direction: 'auto',
  mode: 'scale',
  dither: true,
  palette: 'bw',
  display: '7.5in-waveshare',
  customWidth: 800,
  customHeight: 480,
  filenamePattern: 'wallpaper_{n}',
}

/**
 * Apply filename pattern to generate export name.
 * Tokens: {name} = original name without extension, {n} = 1-based index, {nn} = zero-padded index
 */
export function applyFilenamePattern(pattern, originalFilename, index) {
  const name = originalFilename.replace(/\.[^.]+$/, '')
  return pattern
    .replace(/\{name\}/g, name)
    .replace(/\{nn\}/g, String(index + 1).padStart(3, '0'))
    .replace(/\{n\}/g, String(index + 1))
    + '.bmp'
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch (e) {
    // ignore parse errors
  }
  return { ...defaultSettings }
}

function createSettingsStore() {
  const store = writable(loadSettings())

  store.subscribe((value) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
    } catch (e) {
      // ignore storage errors
    }
  })

  return store
}

export const settings = createSettingsStore()

// images: array of { id, file, originalUrl, processedCanvas, beforeCanvas, filename, brightness, contrast }
export const images = writable([])
