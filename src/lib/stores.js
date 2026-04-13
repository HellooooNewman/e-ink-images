import { writable } from 'svelte/store'

const SETTINGS_KEY = 'eink-settings'

const defaultSettings = {
  direction: 'auto',
  mode: 'scale',
  dither: true,
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

// images: array of { id, file, originalUrl, processedCanvas, filename }
export const images = writable([])
