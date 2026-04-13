<script>
  import { images, settings } from '../lib/stores.js'
  import { processImage } from '../lib/processor.js'

  let dragOver = $state(false)
  let processing = $state(false)

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return
    processing = true

    const files = Array.from(fileList)
    const currentSettings = $settings
    const newImages = []

    for (const file of files) {
      if (!file.type.match(/^image\/(jpeg|png|bmp)$/)) continue
      const id = crypto.randomUUID()
      const originalUrl = URL.createObjectURL(file)
      const { canvas: processedCanvas, beforeCanvas } = await processImage(file, currentSettings, { brightness: 0, contrast: 0 })
      newImages.push({ id, file, originalUrl, processedCanvas, beforeCanvas, filename: file.name, brightness: 0, contrast: 0 })
    }

    images.update((imgs) => [...imgs, ...newImages])
    processing = false
  }

  function onFileInput(e) {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    dragOver = false
    handleFiles(e.dataTransfer.files)
  }

  function onDragOver(e) {
    e.preventDefault()
    dragOver = true
  }

  function onDragLeave() {
    dragOver = false
  }

  const demoImages = [
    { name: 'wallhaven-g8o8kd.jpg', type: 'image/jpeg' },
    { name: 'wallhaven-l8v3ey.png', type: 'image/png' },
    { name: 'wallhaven-jxqrw5.jpg', type: 'image/jpeg' },
    { name: 'wallhaven-j5mz95.png', type: 'image/png' },
  ]

  async function loadDemoImages(e) {
    e.preventDefault()
    e.stopPropagation()
    const files = await Promise.all(
      demoImages.map(async ({ name, type }) => {
        const res = await fetch(`${import.meta.env.BASE_URL}${name}`)
        const blob = await res.blob()
        return new File([blob], name, { type })
      })
    )
    await handleFiles(files)
  }
</script>

<div
  class="upload-zone"
  class:drag-over={dragOver}
  class:processing
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  role="button"
  tabindex="0"
>
  <label class="upload-label">
    <input
      type="file"
      multiple
      accept=".jpg,.jpeg,.png,.bmp"
      onchange={onFileInput}
      class="file-input"
    />
    {#if processing}
      <span class="upload-text">Processing...</span>
    {:else}
      <span class="upload-text">Drop images here or click to upload</span>
      <span class="upload-hint">JPG, PNG, BMP</span>
    {/if}
  </label>
  <button class="demo-btn" onclick={loadDemoImages} disabled={processing}>Load Demo Images</button>
</div>

<style>
  .upload-zone {
    border: 2px dashed var(--border);
    padding: 2rem;
    text-align: center;
    transition: border-color 0.15s, background 0.15s;
    cursor: pointer;
  }

  .upload-zone:hover,
  .upload-zone.drag-over {
    border-color: var(--accent);
    background: var(--bg-hover);
  }

  .upload-zone.processing {
    opacity: 0.6;
    pointer-events: none;
  }

  .upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }

  .file-input {
    display: none;
  }

  .upload-text {
    color: var(--text);
    font-size: 0.9rem;
  }

  .upload-hint {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .demo-btn {
    margin-top: 0.75rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .demo-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text);
  }

  .demo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
