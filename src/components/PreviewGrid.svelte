<script>
  import { images, settings, applyFilenamePattern } from '../lib/stores.js'
  import { canvasToBmpBlob, downloadBlob } from '../lib/bmp.js'
  import { processImage } from '../lib/processor.js'
  import FrameViewer from './FrameViewer.svelte'

  let modalImage = $state(null)
  let viewer3dIndex = $state(-1)
  let show3d = $derived(viewer3dIndex >= 0)

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

  function downloadOne(img) {
    const imgs = $images
    const idx = imgs.findIndex((i) => i.id === img.id)
    const pattern = $settings.filenamePattern || '{name}'
    const bmpName = applyFilenamePattern(pattern, img.filename, idx)
    const blob = canvasToBmpBlob(img.processedCanvas)
    downloadBlob(blob, bmpName)
  }

  async function updateImageAdjustment(id, key, value) {
    const currentSettings = $settings
    images.update((imgs) => imgs.map((img) =>
      img.id === id ? { ...img, [key]: value } : img
    ))
    // Reprocess after updating the value
    const img = $images.find((i) => i.id === id)
    if (!img) return
    const adjustments = { brightness: img.brightness, contrast: img.contrast, [key]: value }
    const { canvas: processedCanvas, beforeCanvas } = await processImage(img.file, currentSettings, adjustments)
    images.update((imgs) => imgs.map((i) =>
      i.id === id ? { ...i, processedCanvas, beforeCanvas } : i
    ))
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
    showBefore = false
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) closeModal()
  }

  let focusedImg = $state(null)
  let showBefore = $state(false)
  let dragId = $state(null)
  let dropTargetId = $state(null)

  function onDragStart(e, img) {
    dragId = img.id
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, img) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dropTargetId = img.id
  }

  function onDragLeave() {
    dropTargetId = null
  }

  function onDrop(e, targetImg) {
    e.preventDefault()
    dropTargetId = null
    if (!dragId || dragId === targetImg.id) return

    images.update((imgs) => {
      const fromIdx = imgs.findIndex((i) => i.id === dragId)
      const toIdx = imgs.findIndex((i) => i.id === targetImg.id)
      if (fromIdx === -1 || toIdx === -1) return imgs
      const copy = [...imgs]
      const [moved] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, moved)
      return copy
    })
    dragId = null
  }

  function onDragEnd() {
    dragId = null
    dropTargetId = null
  }

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
    if (show3d) return // 3D viewer handles its own keys
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
    if (modalImage && e.key === 'b') {
      showBefore = !showBefore
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if $images.length > 0}
  <div class="preview-grid">
    {#each $images as img (img.id)}
      {@const processedCanvas = img.processedCanvas}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="preview-card"
        class:focused={focusedImg?.id === img.id}
        class:dragging={dragId === img.id}
        class:drop-target={dropTargetId === img.id && dragId !== img.id}
        tabindex="0"
        draggable="true"
        onfocus={() => focusedImg = img}
        onblur={() => focusedImg = null}
        ondragstart={(e) => onDragStart(e, img)}
        ondragover={(e) => onDragOver(e, img)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, img)}
        ondragend={onDragEnd}
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
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="preview-adjustments" ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <label class="adjust-row">
            <span class="adjust-label">Brightness</span>
            <input type="range" class="adjust-range" min="-100" max="100" value={img.brightness || 0}
              onchange={(e) => updateImageAdjustment(img.id, 'brightness', parseInt(e.target.value))}
              onpointerdown={(e) => e.stopPropagation()} />
            <span class="adjust-value">{img.brightness || 0}</span>
          </label>
          <label class="adjust-row">
            <span class="adjust-label">Contrast</span>
            <input type="range" class="adjust-range" min="-100" max="100" value={img.contrast || 0}
              onchange={(e) => updateImageAdjustment(img.id, 'contrast', parseInt(e.target.value))}
              onpointerdown={(e) => e.stopPropagation()} />
            <span class="adjust-value">{img.contrast || 0}</span>
          </label>
        </div>
        <div class="preview-actions">
          <button class="btn btn-small" onclick={() => downloadOne(img)}>Save BMP</button>
          <button class="btn btn-small" onclick={() => { viewer3dIndex = $images.findIndex(i => i.id === img.id) }}>View 3D</button>
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
        <button class="btn btn-small" class:btn-active={showBefore} onclick={() => showBefore = !showBefore}>
          {showBefore ? 'Before' : 'After'}
        </button>
        <span class="modal-hint">B to toggle</span>
        <button class="modal-close" onclick={closeModal}>Close</button>
      </div>
      <div class="modal-canvas-wrap">
        <canvas use:paintModalCanvas={showBefore ? modalImage.beforeCanvas : modalImage.processedCanvas}></canvas>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick={() => downloadOne(modalImage)}>Save BMP</button>
      </div>
    </div>
  </div>
{/if}

{#if show3d}
  <FrameViewer images={$images} startIndex={viewer3dIndex} onclose={() => viewer3dIndex = -1} />
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
    cursor: grab;
    transition: opacity 0.15s, border-color 0.15s;
  }

  .preview-card.dragging {
    opacity: 0.4;
    cursor: grabbing;
  }

  .preview-card.drop-target {
    border-color: var(--accent);
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

  .preview-adjustments {
    padding: 0.4rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    border-top: 1px solid var(--border);
    -webkit-user-drag: none;
  }

  .adjust-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }

  .adjust-label {
    color: var(--text-muted);
    font-size: 0.65rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    width: 4.5rem;
    flex-shrink: 0;
  }

  .adjust-range {
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
    height: 4px;
  }

  .adjust-value {
    color: var(--text-muted);
    font-size: 0.65rem;
    font-family: var(--font-mono);
    min-width: 1.8rem;
    text-align: right;
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

  .btn-active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .modal-hint {
    color: var(--text-muted);
    font-size: 0.65rem;
    font-family: var(--font-mono);
    opacity: 0.6;
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
