<script>
  import { images, settings, applyFilenamePattern } from '../lib/stores.js'
  import { canvasToBmpBlob, downloadBlob } from '../lib/bmp.js'
  import { zipSync } from 'fflate'

  let zipping = $state(false)

  async function downloadAllZip() {
    zipping = true
    try {
      const files = {}
      const filePaths = []
      const encoder = new TextEncoder()
      const pattern = $settings.filenamePattern || '{name}'

      $images.forEach((img, i) => {
        const bmpName = applyFilenamePattern(pattern, img.filename, i)
        const picPath = `pic/${bmpName}`
        const blob = canvasToBmpBlob(img.processedCanvas)
        filePaths.push({ picPath, blob })
      })

      for (const { picPath, blob } of filePaths) {
        const buffer = await blob.arrayBuffer()
        files[picPath] = new Uint8Array(buffer)
      }

      const paths = filePaths.map((f) => f.picPath)

      files['fileList.txt'] = encoder.encode(paths.join('\n') + '\n')

      const randomIndex = Math.floor(Math.random() * paths.length)
      files['index.txt'] = encoder.encode(String(randomIndex) + '\n')

      const zipped = zipSync(files, { level: 0 })
      const zipBlob = new Blob([zipped], { type: 'application/zip' })
      downloadBlob(zipBlob, 'eink-images.zip')
    } finally {
      zipping = false
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
      <button class="btn" onclick={downloadAllZip} disabled={zipping}>
        {zipping ? 'Zipping...' : 'Download All (.zip)'}
      </button>
      <button class="btn btn-muted" onclick={clearAll}>Clear All</button>
    </div>
  </div>
{/if}

<style>
  .export-bar {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    background: var(--bg-surface);
    z-index: 100;
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
