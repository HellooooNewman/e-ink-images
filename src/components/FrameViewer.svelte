<script>
  import { onMount } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

  let { images = [], startIndex = 0, onclose = () => {} } = $props()

  let containerEl = $state(null)
  let currentIndex = $state(startIndex) // only need the initial value
  let playing = $state(false)
  let transitioning = $state(false)
  let playInterval = null
  const PLAY_DELAY = 5000 // ms between images (after transition completes)
  const TRANSITION_DURATION = 2800 // approximate refresh cycle length

  let renderer, scene, camera, controls, frameMesh, screenMesh, screenMaterial, backMesh
  let animationId
  // Offscreen canvas for compositing transition frames
  let transitionCanvas, transitionCtx

  function canvasToTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }

  function setScreenFromCanvas(canvas) {
    if (!screenMaterial) return
    if (screenMaterial.map) screenMaterial.map.dispose()
    screenMaterial.map = canvasToTexture(canvas)
    screenMaterial.color.setScalar(1.0)
    screenMaterial.needsUpdate = true
  }

  /**
   * Simulate 7-color ACeP e-ink refresh cycle.
   *
   * Phase 1 — Global clear: flash old image to black, then white, repeated.
   *           This "shakes loose" all pigment particles.
   * Phase 2 — Color waveform passes: the new image builds up color by color.
   *           Each pass reveals one color channel while others remain muted,
   *           with brief white flashes between passes (waveform resets).
   * Phase 3 — Final settling: image snaps to full clarity.
   */
  function flashTransition(oldCanvas, newCanvas) {
    if (!screenMaterial) return
    transitioning = true

    const w = newCanvas.width
    const h = newCanvas.height

    if (!transitionCanvas) {
      transitionCanvas = document.createElement('canvas')
      transitionCtx = transitionCanvas.getContext('2d')
    }
    transitionCanvas.width = w
    transitionCanvas.height = h

    // Get old image pixel data for fade-out
    let oldImgData = null
    if (oldCanvas) {
      const tmpOld = document.createElement('canvas')
      tmpOld.width = w
      tmpOld.height = h
      tmpOld.getContext('2d').drawImage(oldCanvas, 0, 0, w, h)
      oldImgData = tmpOld.getContext('2d').getImageData(0, 0, w, h)
    }

    // Get new image pixel data for buildup
    const tmpNew = document.createElement('canvas')
    tmpNew.width = w
    tmpNew.height = h
    tmpNew.getContext('2d').drawImage(newCanvas, 0, 0)
    const newImgData = tmpNew.getContext('2d').getImageData(0, 0, w, h)

    const channels = [
      { filter: (r, g, b) => { const l = 0.299*r + 0.587*g + 0.114*b; return l < 60 } },
      { filter: (r, g, b) => { const l = 0.299*r + 0.587*g + 0.114*b; return l < 100 } },
      { filter: (r, g, b) => { const l = 0.299*r + 0.587*g + 0.114*b; return l < 150 } },
      { filter: () => true },
    ]

    const steps = []
    let t = 0

    // --- Phase 1: Fade out old image toward white ---
    if (oldImgData) {
      // Progressively wash out the old image
      const fadeSteps = [0.75, 0.5, 0.3, 0.15, 0.05]
      for (const strength of fadeSteps) {
        steps.push({ time: t, type: 'fadeOld', strength })
        t += 150
      }
    }

    // Blank white canvas — old image fully cleared
    steps.push({ time: t, type: 'solid', color: [255, 255, 255] })
    t += 200

    // --- Phase 2: Build up new image from darkest tones to full ---
    steps.push({ time: t, type: 'channel', channel: 0, strength: 0.3 })
    t += 220
    steps.push({ time: t, type: 'channel', channel: 0, strength: 0.5 })
    t += 180
    steps.push({ time: t, type: 'channel', channel: 1, strength: 0.45 })
    t += 220
    steps.push({ time: t, type: 'channel', channel: 1, strength: 0.6 })
    t += 180
    steps.push({ time: t, type: 'channel', channel: 2, strength: 0.55 })
    t += 180
    steps.push({ time: t, type: 'channel', channel: 2, strength: 0.7 })
    t += 160
    steps.push({ time: t, type: 'channel', channel: 3, strength: 0.75 })
    t += 160
    steps.push({ time: t, type: 'channel', channel: 3, strength: 0.85 })
    t += 140
    steps.push({ time: t, type: 'channel', channel: 3, strength: 0.94 })
    t += 120

    // --- Phase 3: Final settle ---
    steps.push({ time: t, type: 'final' })
    t += 10

    const totalDuration = t

    // Render each step
    for (const step of steps) {
      setTimeout(() => {
        if (!screenMaterial) return
        const ctx = transitionCtx
        const src = newImgData.data

        if (step.type === 'solid') {
          ctx.fillStyle = `rgb(${step.color[0]},${step.color[1]},${step.color[2]})`
          ctx.fillRect(0, 0, w, h)
        } else if (step.type === 'fadeOld' && oldImgData) {
          // Old image blended toward white
          const outData = ctx.createImageData(w, h)
          const out = outData.data
          const old = oldImgData.data
          const s = step.strength
          for (let i = 0; i < old.length; i += 4) {
            out[i]   = Math.round(old[i]   * s + 255 * (1 - s))
            out[i+1] = Math.round(old[i+1] * s + 255 * (1 - s))
            out[i+2] = Math.round(old[i+2] * s + 255 * (1 - s))
            out[i+3] = 255
          }
          ctx.putImageData(outData, 0, 0)
        } else if (step.type === 'channel') {
          // Show new image filtered by channel with strength
          const outData = ctx.createImageData(w, h)
          const out = outData.data
          const ch = channels[step.channel]
          const s = step.strength

          for (let i = 0; i < src.length; i += 4) {
            const r = src[i], g = src[i+1], b = src[i+2]
            if (ch.filter(r, g, b)) {
              // Blend toward white based on inverse strength (washed out look)
              out[i]   = Math.round(r * s + 255 * (1 - s))
              out[i+1] = Math.round(g * s + 255 * (1 - s))
              out[i+2] = Math.round(b * s + 255 * (1 - s))
            } else {
              out[i] = 255; out[i+1] = 255; out[i+2] = 255
            }
            out[i+3] = 255
          }
          ctx.putImageData(outData, 0, 0)
        } else if (step.type === 'final') {
          ctx.putImageData(newImgData, 0, 0)
        }

        setScreenFromCanvas(transitionCanvas)
      }, step.time)
    }

    setTimeout(() => {
      // Ensure final image is clean
      setScreenFromCanvas(newCanvas)
      transitioning = false
    }, totalDuration + 30)
  }

  function updateScreenImage() {
    if (!screenMaterial || !images[currentIndex]) return
    setScreenFromCanvas(images[currentIndex].processedCanvas)

    const img = images[currentIndex].processedCanvas
    const aspect = img.width / img.height
    updateFrameGeometry(aspect)
    fitCameraToFrame()
  }

  function navigateWithFlash(newIndex) {
    if (transitioning) return
    // Wrap around for looping
    newIndex = ((newIndex % images.length) + images.length) % images.length

    // Capture old canvas before switching
    const oldCanvas = images[currentIndex]?.processedCanvas || null
    currentIndex = newIndex
    const newCanvas = images[currentIndex].processedCanvas

    // Update frame geometry for new aspect ratio
    const aspect = newCanvas.width / newCanvas.height
    updateFrameGeometry(aspect)

    // Run the full e-ink refresh simulation
    flashTransition(oldCanvas, newCanvas)
  }

  function updateFrameGeometry(aspect) {
    const screenW = 2.4 * aspect
    const screenH = 2.4
    const frameW = screenW + 0.4
    const frameH = screenH + 0.4
    const frameDepth = 0.15

    if (screenMesh) {
      screenMesh.geometry.dispose()
      screenMesh.geometry = new THREE.PlaneGeometry(screenW, screenH)
      screenMesh.position.z = frameDepth / 2 + 0.001
    }

    if (frameMesh) {
      frameMesh.geometry.dispose()
      const frameShape = new THREE.Shape()
      frameShape.moveTo(-frameW / 2, -frameH / 2)
      frameShape.lineTo(frameW / 2, -frameH / 2)
      frameShape.lineTo(frameW / 2, frameH / 2)
      frameShape.lineTo(-frameW / 2, frameH / 2)
      frameShape.lineTo(-frameW / 2, -frameH / 2)

      const hole = new THREE.Path()
      hole.moveTo(-screenW / 2, -screenH / 2)
      hole.lineTo(-screenW / 2, screenH / 2)
      hole.lineTo(screenW / 2, screenH / 2)
      hole.lineTo(screenW / 2, -screenH / 2)
      hole.lineTo(-screenW / 2, -screenH / 2)
      frameShape.holes.push(hole)

      frameMesh.geometry = new THREE.ExtrudeGeometry(frameShape, {
        depth: frameDepth, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3,
      })
    }

    if (backMesh) {
      backMesh.geometry.dispose()
      backMesh.geometry = new THREE.PlaneGeometry(frameW, frameH)
    }
  }

  /**
   * Position camera so the full frame fits in the viewport with some padding.
   */
  function fitCameraToFrame() {
    if (!camera || !containerEl || !images[currentIndex]) return

    const img = images[currentIndex].processedCanvas
    const aspect = img.width / img.height
    const frameW = 2.4 * aspect + 0.4
    const frameH = 2.4 + 0.4
    const padding = 1.15 // 15% padding

    const viewportAspect = containerEl.clientWidth / containerEl.clientHeight
    const fovRad = THREE.MathUtils.degToRad(camera.fov)

    // Calculate distance needed to fit width and height
    let dist
    if (frameW / viewportAspect > frameH) {
      // Width is the constraint
      dist = (frameW * padding / 2) / (Math.tan(fovRad / 2) * viewportAspect)
    } else {
      // Height is the constraint
      dist = (frameH * padding / 2) / Math.tan(fovRad / 2)
    }

    camera.position.set(0, 0, dist)
    camera.lookAt(0, 0, 0)
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }

  function initScene() {
    if (!containerEl) return
    const w = containerEl.clientWidth
    const h = containerEl.clientHeight

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x1a1a1a)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerEl.appendChild(renderer.domElement)

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.5
    controls.maxDistance = 15

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(3, 4, 5)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-2, -1, 3)
    scene.add(fillLight)

    // Initial dimensions
    const img = images[currentIndex]?.processedCanvas
    const aspect = img ? img.width / img.height : 800 / 480
    const screenW = 2.4 * aspect
    const screenH = 2.4
    const frameW = screenW + 0.4
    const frameH = screenH + 0.4
    const frameDepth = 0.15

    // Frame
    const frameShape = new THREE.Shape()
    frameShape.moveTo(-frameW / 2, -frameH / 2)
    frameShape.lineTo(frameW / 2, -frameH / 2)
    frameShape.lineTo(frameW / 2, frameH / 2)
    frameShape.lineTo(-frameW / 2, frameH / 2)
    frameShape.lineTo(-frameW / 2, -frameH / 2)

    const hole = new THREE.Path()
    hole.moveTo(-screenW / 2, -screenH / 2)
    hole.lineTo(-screenW / 2, screenH / 2)
    hole.lineTo(screenW / 2, screenH / 2)
    hole.lineTo(screenW / 2, -screenH / 2)
    hole.lineTo(-screenW / 2, -screenH / 2)
    frameShape.holes.push(hole)

    frameMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(frameShape, {
        depth: frameDepth, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3,
      }),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.1 })
    )
    scene.add(frameMesh)

    // Screen
    screenMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 })
    screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMaterial)
    screenMesh.position.z = frameDepth / 2 + 0.001
    scene.add(screenMesh)

    // Back panel
    backMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(frameW, frameH),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    )
    backMesh.position.z = -0.001
    scene.add(backMesh)

    updateScreenImage()

    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      if (!containerEl) return
      const w2 = containerEl.clientWidth
      const h2 = containerEl.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
      fitCameraToFrame()
    })
    resizeObserver.observe(containerEl)
  }

  // Play mode
  function togglePlay() {
    if (playing) {
      stopPlay()
    } else {
      playing = true
      advancePlay()
    }
  }

  function advancePlay() {
    if (!playing) return
    playInterval = setTimeout(() => {
      if (!playing) return
      const next = (currentIndex + 1) % images.length
      navigateWithFlash(next)
      // Wait for flash to finish, then schedule next
      setTimeout(() => advancePlay(), TRANSITION_DURATION + 100)
    }, PLAY_DELAY)
  }

  function stopPlay() {
    playing = false
    if (playInterval) {
      clearTimeout(playInterval)
      playInterval = null
    }
  }

  function navigate(dir) {
    stopPlay()
    navigateWithFlash(currentIndex + dir)
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      stopPlay()
      onclose()
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      navigate(1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      navigate(-1)
    }
    if (e.key === 'p' || e.key === ' ') {
      e.preventDefault()
      togglePlay()
    }
  }

  onMount(() => {
    initScene()
    return () => {
      stopPlay()
      if (animationId) cancelAnimationFrame(animationId)
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  })
</script>

<svelte:window onkeydown={onKeydown} />

<div class="frame-viewer">
  <div class="viewer-header">
    <span class="viewer-filename">{images[currentIndex]?.filename}</span>
    <span class="viewer-counter">{currentIndex + 1} / {images.length}</span>
    <div class="viewer-nav">
      <button class="btn btn-small" disabled={currentIndex === 0 || transitioning} onclick={() => navigate(-1)}>Prev</button>
      <button class="btn btn-small" class:btn-active={playing} onclick={togglePlay}>
        {playing ? 'Stop' : 'Play'}
      </button>
      <button class="btn btn-small" disabled={currentIndex === images.length - 1 || transitioning} onclick={() => navigate(1)}>Next</button>
    </div>
    <button class="btn btn-small" onclick={() => { stopPlay(); onclose() }}>Close</button>
  </div>
  <div class="viewer-canvas" bind:this={containerEl}></div>
  <div class="viewer-hint">Drag to orbit, scroll to zoom, arrow keys to navigate, P or Space to play/stop</div>
</div>

<style>
  .frame-viewer {
    position: fixed;
    inset: 0;
    background: #0a0a0a;
    z-index: 2000;
    display: flex;
    flex-direction: column;
  }

  .viewer-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    z-index: 1;
  }

  .viewer-filename {
    color: var(--text);
    font-size: 0.85rem;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .viewer-counter {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-family: var(--font-mono);
  }

  .viewer-nav {
    display: flex;
    gap: 0.25rem;
  }

  .btn-active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .viewer-canvas {
    flex: 1;
    overflow: hidden;
  }

  .viewer-hint {
    padding: 0.4rem 1rem;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.7rem;
    text-align: center;
    font-family: var(--font-mono);
  }
</style>
