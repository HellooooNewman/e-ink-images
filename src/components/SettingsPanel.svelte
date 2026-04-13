<script>
  import { settings, images, DISPLAY_PRESETS, COLOR_PALETTES, applyFilenamePattern } from '../lib/stores.js'
  import { processImage } from '../lib/processor.js'

  let previewFilenames = $derived(() => {
    const pat = $settings.filenamePattern || '{name}'
    return [
      applyFilenamePattern(pat, 'photo.jpg', 0),
      applyFilenamePattern(pat, 'sunset.png', 1),
      applyFilenamePattern(pat, 'landscape.jpg', 2),
    ]
  })

  // Reprocess all images when settings change
  async function reprocessAll() {
    const currentSettings = $settings
    const currentImages = $images
    if (currentImages.length === 0) return

    const updated = []
    for (const img of currentImages) {
      const { canvas: processedCanvas, beforeCanvas } = await processImage(img.file, currentSettings, { brightness: img.brightness || 0, contrast: img.contrast || 0 })
      updated.push({ ...img, processedCanvas, beforeCanvas })
    }
    images.set(updated)
  }

  function updateSetting(key, value) {
    settings.update((s) => ({ ...s, [key]: value }))
    if (key !== 'filenamePattern') {
      reprocessAll()
    }
  }
</script>

<div class="settings-panel">
  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Display</span>
      <span class="setting-hint">Target e-ink screen size for output images</span>
    </div>
    <div class="setting-options">
      <select
        class="select-input"
        value={$settings.display}
        onchange={(e) => updateSetting('display', e.target.value)}
      >
        {#each DISPLAY_PRESETS as preset}
          <option value={preset.id}>
            {preset.label} ({preset.width}×{preset.height})
          </option>
        {/each}
      </select>
      {#if $settings.display === 'custom'}
        <input
          type="number"
          class="dim-input"
          value={$settings.customWidth}
          min="1"
          onchange={(e) => updateSetting('customWidth', parseInt(e.target.value) || 800)}
        />
        <span class="dim-separator">×</span>
        <input
          type="number"
          class="dim-input"
          value={$settings.customHeight}
          min="1"
          onchange={(e) => updateSetting('customHeight', parseInt(e.target.value) || 480)}
        />
      {/if}
    </div>
  </div>

  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Direction</span>
      <span class="setting-hint">Auto detects from image, or force a specific orientation</span>
    </div>
    <div class="setting-options">
      {#each ['auto', 'landscape', 'portrait'] as opt}
        <label class="radio-label">
          <input
            type="radio"
            name="direction"
            value={opt}
            checked={$settings.direction === opt}
            onchange={() => updateSetting('direction', opt)}
          />
          {opt}
        </label>
      {/each}
    </div>
  </div>

  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Mode</span>
      <span class="setting-hint">Scale fills with white bars, cut crops to fit exactly</span>
    </div>
    <div class="setting-options">
      {#each ['scale', 'cut'] as opt}
        <label class="radio-label">
          <input
            type="radio"
            name="mode"
            value={opt}
            checked={$settings.mode === opt}
            onchange={() => updateSetting('mode', opt)}
          />
          {opt}
        </label>
      {/each}
    </div>
  </div>

  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Palette</span>
      <span class="setting-hint">Match the color capabilities of your e-ink display</span>
    </div>
    <div class="setting-options">
      <select
        class="select-input"
        value={$settings.palette}
        onchange={(e) => updateSetting('palette', e.target.value)}
      >
        {#each COLOR_PALETTES as pal}
          <option value={pal.id}>
            {pal.label} ({pal.colors.length} colors)
          </option>
        {/each}
      </select>
    </div>
  </div>

  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Dither</span>
      <span class="setting-hint">Error diffusion for smoother gradients on limited palettes</span>
    </div>
    <div class="setting-options">
      <label class="radio-label">
        <input
          type="checkbox"
          checked={$settings.dither}
          onchange={(e) => updateSetting('dither', e.target.checked)}
        />
        Floyd-Steinberg
      </label>
    </div>
  </div>

  <div class="setting-row">
    <div class="setting-header">
      <span class="setting-label">Filename</span>
      <span class="setting-hint">{'{name}'} = original, {'{n}'} = number, {'{nn}'} = padded</span>
    </div>
    <div class="setting-options">
      <input
        type="text"
        class="text-input"
        value={$settings.filenamePattern}
        oninput={(e) => updateSetting('filenamePattern', e.target.value)}
        placeholder="{'{name}'}"
      />
      <span class="filename-preview">{previewFilenames().join(', ')}</span>
    </div>
  </div>
</div>

<style>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    background: var(--bg-surface);
  }

  .setting-row {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  .setting-header {
    display: flex;
    flex-direction: column;
    min-width: 7rem;
    flex-shrink: 0;
  }

  .setting-label {
    color: var(--text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-mono);
  }

  .setting-hint {
    color: var(--text-muted);
    font-size: 0.65rem;
    opacity: 0.7;
    line-height: 1.3;
    margin-top: 0.1rem;
  }

  .setting-options {
    display: flex;
    gap: 0.75rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text);
    font-size: 0.85rem;
    cursor: pointer;
  }

  input[type='radio'],
  input[type='checkbox'] {
    accent-color: var(--accent);
  }

  .select-input {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
  }

  .dim-input {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
    font-family: var(--font-mono);
    width: 5rem;
    text-align: center;
  }

  .dim-separator {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .text-input {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
    font-family: var(--font-mono);
    width: 10rem;
  }

  .filename-preview {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }
</style>
