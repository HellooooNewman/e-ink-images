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
  const PLAY_DELAY = 5000 // ms between images
  const FLASH_DURATION = 600 // total flash animation ms

  let renderer, scene, camera, controls, frameMesh, screenMesh, screenMaterial, backMesh
  let animationId

  function canvasToTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }

  /**
   * Simulate e-ink display refresh — progressive buildup.
   * Sets the new texture immediately, then animates material color
   * from black through grays to white so the image appears to
   * "build up" in passes like real e-ink particle settling.
   */
  function flashTransition(callback) {
    if (!screenMaterial) { callback(); return }
    transitioning = true

    // Set the new image texture right away
    callback()

    // Darken to black, then progressively reveal
    const steps = [
      { brightness: 0.0,  delay: 0 },                     // black — clear
      { brightness: 0.05, delay: FLASH_DURATION * 0.08 },  // faintest ghost
      { brightness: 0.12, delay: FLASH_DURATION * 0.16 },
      { brightness: 0.25, delay: FLASH_DURATION * 0.26 },
      { brightness: 0.40, delay: FLASH_DURATION * 0.38 },
      { brightness: 0.55, delay: FLASH_DURATION * 0.50 },
      { brightness: 0.70, delay: FLASH_DURATION * 0.62 },
      { brightness: 0.82, delay: FLASH_DURATION * 0.74 },
      { brightness: 0.92, delay: FLASH_DURATION * 0.85 },
      { brightness: 1.0,  delay: FLASH_DURATION * 0.95 },  // full image
    ]

    for (const step of steps) {
      setTimeout(() => {
        if (screenMaterial) {
          screenMaterial.color.setScalar(step.brightness)
          screenMaterial.needsUpdate = true
        }
      }, step.delay)
    }

    setTimeout(() => {
      transitioning = false
    }, FLASH_DURATION)
  }

  function updateScreenImage() {
    if (!screenMaterial || !images[currentIndex]) return
    screenMaterial.map = canvasToTexture(images[currentIndex].processedCanvas)
    screenMaterial.color.setScalar(1.0)
    screenMaterial.needsUpdate = true

    const img = images[currentIndex].processedCanvas
    const aspect = img.width / img.height
    updateFrameGeometry(aspect)
    fitCameraToFrame()
  }

  function navigateWithFlash(newIndex) {
    if (transitioning) return
    // Wrap around for looping
    newIndex = ((newIndex % images.length) + images.length) % images.length
    currentIndex = newIndex

    // Update geometry and texture for the new image, then flash builds it up
    const img = images[currentIndex].processedCanvas
    const aspect = img.width / img.height
    updateFrameGeometry(aspect)

    flashTransition(() => {
      if (!screenMaterial) return
      screenMaterial.map = canvasToTexture(images[currentIndex].processedCanvas)
      screenMaterial.needsUpdate = true
    })
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
      setTimeout(() => advancePlay(), FLASH_DURATION + 100)
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
