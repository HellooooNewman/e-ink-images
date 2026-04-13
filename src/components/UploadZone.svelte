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
      const processedCanvas = await processImage(file, currentSettings)
      newImages.push({ id, file, originalUrl, processedCanvas, filename: file.name })
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
</style>
