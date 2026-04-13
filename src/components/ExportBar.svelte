<script>
  import { images } from '../lib/stores.js'
  import { canvasToBmpBlob, downloadBlob } from '../lib/bmp.js'

  function getBmpName(filename) {
    return filename.replace(/\.[^.]+$/, '.bmp')
  }

  function downloadAll() {
    for (const img of $images) {
      const blob = canvasToBmpBlob(img.processedCanvas)
      downloadBlob(blob, getBmpName(img.filename))
    }
  }

  function clearAll() {
    $images.forEach((img) => {
      if (img.originalUrl) URL.revokeObjectURL(img.originalUrl)
    })
    images.set([])
  }
</script>

{#if $images.length > 0}
  <div class="export-bar">
    <span class="export-count">{$images.length} image{$images.length !== 1 ? 's' : ''}</span>
    <div class="export-actions">
      <button class="btn" onclick={downloadAll}>Download All BMP</button>
      <button class="btn btn-muted" onclick={clearAll}>Clear All</button>
    </div>
  </div>
{/if}

<style>
  .export-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    background: var(--bg-surface);
  }

  .export-count {
    color: var(--text-muted);
    font-size: 0.85rem;
    font-family: var(--font-mono);
  }

  .export-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
