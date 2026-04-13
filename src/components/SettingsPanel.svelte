<script>
  import { settings, images } from '../lib/stores.js'
  import { processImage } from '../lib/processor.js'

  // Reprocess all images when settings change
  async function reprocessAll() {
    const currentSettings = $settings
    const currentImages = $images
    if (currentImages.length === 0) return

    const updated = []
    for (const img of currentImages) {
      const processedCanvas = await processImage(img.file, currentSettings)
      updated.push({ ...img, processedCanvas })
    }
    images.set(updated)
  }

  function updateSetting(key, value) {
    settings.update((s) => ({ ...s, [key]: value }))
    reprocessAll()
  }
</script>

<div class="settings-panel">
  <div class="setting-group">
    <span class="setting-label">Direction</span>
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

  <div class="setting-group">
    <span class="setting-label">Mode</span>
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

  <div class="setting-group">
    <span class="setting-label">Dither</span>
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
</div>

<style>
  .settings-panel {
    display: flex;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    background: var(--bg-surface);
    flex-wrap: wrap;
  }

  .setting-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .setting-label {
    color: var(--text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-mono);
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
</style>
