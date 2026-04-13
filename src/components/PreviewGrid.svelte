<script>
  import { images } from '../lib/stores.js'
  import { canvasToBmpBlob, downloadBlob } from '../lib/bmp.js'

  let modalImage = $state(null)

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

  function paintModalCanvas(el, srcCanvas) {
    if (!srcCanvas) return
    el.width = srcCanvas.width
    el.height = srcCanvas.height
    const ctx = el.getContext('2d')
    ctx.drawImage(srcCanvas, 0, 0)
    return {
      update(newCanvas) {
        if (!newCanvas) return
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

  function openModal(img) {
    modalImage = img
  }

  function closeModal() {
    modalImage = null
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) closeModal()
  }

  let focusedImg = $state(null)

  function navigateModal(direction) {
    if (!modalImage) return
    const imgs = $images
    const idx = imgs.findIndex((i) => i.id === modalImage.id)
    const next = idx + direction
    if (next >= 0 && next < imgs.length) {
      modalImage = imgs[next]
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal()
    if (e.key === ' ') {
      e.preventDefault()
      if (modalImage) {
        closeModal()
      } else if (focusedImg) {
        openModal(focusedImg)
      }
    }
    if (modalImage && e.key === 'ArrowRight') {
      e.preventDefault()
      navigateModal(1)
    }
    if (modalImage && e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateModal(-1)
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if $images.length > 0}
  <div class="preview-grid">
    {#each $images as img (img.id)}
      {@const processedCanvas = img.processedCanvas}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="preview-card"
        class:focused={focusedImg?.id === img.id}
        tabindex="0"
        onfocus={() => focusedImg = img}
        onblur={() => focusedImg = null}
      >
        <div class="preview-canvas-wrap">
          <canvas use:paintCanvas={processedCanvas}></canvas>
          <button class="fullscreen-btn" onclick={() => openModal(img)} title="View full size">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="9,1 13,1 13,5" />
              <polyline points="5,13 1,13 1,9" />
              <line x1="13" y1="1" x2="8.5" y2="5.5" />
              <line x1="1" y1="13" x2="5.5" y2="8.5" />
            </svg>
          </button>
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

{#if modalImage}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={onBackdropClick} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-filename">{modalImage.filename}</span>
        <span class="modal-dims">{modalImage.processedCanvas.width}×{modalImage.processedCanvas.height}</span>
        <button class="modal-close" onclick={closeModal}>Close</button>
      </div>
      <div class="modal-canvas-wrap">
        <canvas use:paintModalCanvas={modalImage.processedCanvas}></canvas>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick={() => downloadOne(modalImage)}>Save BMP</button>
      </div>
    </div>
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
    position: relative;
  }

  .preview-canvas-wrap canvas {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .fullscreen-btn {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border: none;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .preview-canvas-wrap:hover .fullscreen-btn {
    opacity: 1;
  }

  .fullscreen-btn:hover {
    background: rgba(0, 0, 0, 0.8);
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

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .modal-content {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    max-width: 95vw;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-filename {
    color: var(--text);
    font-size: 0.85rem;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modal-dims {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  .modal-close {
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px solid var(--border);
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    font-family: inherit;
  }

  .modal-close:hover {
    color: var(--text);
    background: var(--border);
  }

  .modal-canvas-wrap {
    background: #fff;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-canvas-wrap canvas {
    max-width: 100%;
    max-height: 80vh;
    display: block;
  }

  .modal-actions {
    padding: 0.5rem 0.75rem;
    display: flex;
    gap: 0.5rem;
    border-top: 1px solid var(--border);
  }
</style>
