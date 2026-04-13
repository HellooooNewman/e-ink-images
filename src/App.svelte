<script>
  import UploadZone from './components/UploadZone.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import PreviewGrid from './components/PreviewGrid.svelte'
  import ExportBar from './components/ExportBar.svelte'
</script>

<main>
  <header>
    <h1>E-Ink Image Converter</h1>
    <p class="subtitle">Process images for e-ink displays — 800×480 / 480×800</p>
  </header>

  <div class="layout">
    <UploadZone />
    <SettingsPanel />
    <PreviewGrid />
    <ExportBar />
  </div>
</main>

<style>
  :root {
    --bg: #141414;
    --bg-surface: #1e1e1e;
    --bg-hover: #252525;
    --text: #d4d4d4;
    --text-muted: #808080;
    --border: #333;
    --accent: #6b9fce;
    --font-mono: 'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  :global(.btn) {
    background: var(--bg-hover);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.1s;
    font-family: inherit;
  }

  :global(.btn:hover) {
    background: var(--border);
  }

  :global(.btn-small) {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  :global(.btn-muted) {
    color: var(--text-muted);
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 0.8rem;
    margin-top: 0.15rem;
  }

  .layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
