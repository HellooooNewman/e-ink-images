<script>
  import { images } from '../lib/stores.js'
  import { canvasToBmpBlob, downloadBlob } from '../lib/bmp.js'

  function paintCanvas(el, srcCanvas) {
    el.width = srcCanvas.width
    el.height = srcCanvas.height
    const ctx = el.getContext('2d')
    ctx.drawImage(srcCanvas, 0, 0)
    return {
      update(newCanvas) {
        el.width = newCanvas.width
        el.height = newCanvas.height
        const ctx2 = el.getContext('2d')
        ctx2.drawImage(newCanvas, 0, 0)
      }
    }
  }

  function getBmpName(filename) {
    return filename.replace(/\.[^.]+$/, '.bmp')
  }

  function downloadOne(img) {
    const blob = canvasToBmpBlob(img.processedCanvas)
    downloadBlob(blob, getBmpName(img.filename))
  }

  function removeImage(id) {
    images.update((imgs) => {
      const removed = imgs.find((i) => i.id === id)
      if (removed?.originalUrl) URL.revokeObjectURL(removed.originalUrl)
      return imgs.filter((i) => i.id !== id)
    })
  }
</script>

{#if $images.length > 0}
  <div class="preview-grid">
    {#each $images as img (img.id)}
      {@const processedCanvas = img.processedCanvas}
      <div class="preview-card">
        <div class="preview-canvas-wrap">
          <canvas use:paintCanvas={processedCanvas}></canvas>
        </div>
        <div class="preview-info">
          <span class="preview-filename" title={img.filename}>{img.filename}</span>
          <span class="preview-dims">{processedCanvas.width}×{processedCanvas.height}</span>
        </div>
        <div class="preview-actions">
          <button class="btn btn-small" onclick={() => downloadOne(img)}>Save BMP</button>
          <button class="btn btn-small btn-muted" onclick={() => removeImage(img.id)}>Remove</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .preview-card {
    border: 1px solid var(--border);
    background: var(--bg-surface);
    overflow: hidden;
  }

  .preview-canvas-wrap {
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .preview-canvas-wrap canvas {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .preview-info {
    padding: 0.5rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
  }

  .preview-filename {
    color: var(--text);
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }

  .preview-dims {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  .preview-actions {
    padding: 0.5rem 0.75rem;
    display: flex;
    gap: 0.5rem;
    border-top: 1px solid var(--border);
  }
</style>
