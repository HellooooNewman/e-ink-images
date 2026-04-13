<script>
  import { onMount } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

  let { images = [], startIndex = 0, onclose = () => {} } = $props()

  let containerEl = $state(null)
  // eslint-disable-next-line -- startIndex is intentionally captured once
  let currentIndex = $state(startIndex) // only need the initial value
  let renderer, scene, camera, controls, frameMesh, screenMesh, screenMaterial
  let animationId

  function canvasToTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }

  function updateScreenImage() {
    if (!screenMaterial || !images[currentIndex]) return
    if (screenMaterial.map) screenMaterial.map.dispose()
    screenMaterial.map = canvasToTexture(images[currentIndex].processedCanvas)
    screenMaterial.needsUpdate = true

    // Update frame aspect ratio to match image
    const img = images[currentIndex].processedCanvas
    const aspect = img.width / img.height
    updateFrameGeometry(aspect)
  }

  function updateFrameGeometry(aspect) {
    const screenW = 2.4 * aspect
    const screenH = 2.4
    const frameW = screenW + 0.4
    const frameH = screenH + 0.4
    const frameDepth = 0.15

    // Update screen
    if (screenMesh) {
      screenMesh.geometry.dispose()
      screenMesh.geometry = new THREE.PlaneGeometry(screenW, screenH)
      screenMesh.position.z = frameDepth / 2 + 0.001
    }

    // Update frame
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

      const extrudeSettings = { depth: frameDepth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }
      frameMesh.geometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings)
    }
  }

  function initScene() {
    if (!containerEl) return
    const w = containerEl.clientWidth
    const h = containerEl.clientHeight

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x1a1a1a)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerEl.appendChild(renderer.domElement)

    // Scene
    scene = new THREE.Scene()

    // Camera
    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
    camera.position.set(0, 0, 5)

    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2
    controls.maxDistance = 12

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambient)

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

    // Frame (extruded shape with hole)
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

    const extrudeSettings = { depth: frameDepth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }
    const frameGeo = new THREE.ExtrudeGeometry(frameShape, extrudeSettings)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.1,
    })
    frameMesh = new THREE.Mesh(frameGeo, frameMat)
    scene.add(frameMesh)

    // Screen (flat plane with image texture)
    const screenGeo = new THREE.PlaneGeometry(screenW, screenH)
    screenMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
    })
    screenMesh = new THREE.Mesh(screenGeo, screenMaterial)
    screenMesh.position.z = frameDepth / 2 + 0.001
    scene.add(screenMesh)

    // Load initial image
    updateScreenImage()

    // Back panel
    const backGeo = new THREE.PlaneGeometry(frameW, frameH)
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    const backMesh = new THREE.Mesh(backGeo, backMat)
    backMesh.position.z = -0.001
    scene.add(backMesh)

    // Animation loop
    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (!containerEl) return
      const w2 = containerEl.clientWidth
      const h2 = containerEl.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    })
    resizeObserver.observe(containerEl)
  }

  function navigate(dir) {
    const next = currentIndex + dir
    if (next >= 0 && next < images.length) {
      currentIndex = next
      updateScreenImage()
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
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
  }

  onMount(() => {
    initScene()
    return () => {
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
      <button class="btn btn-small" disabled={currentIndex === 0} onclick={() => navigate(-1)}>Prev</button>
      <button class="btn btn-small" disabled={currentIndex === images.length - 1} onclick={() => navigate(1)}>Next</button>
    </div>
    <button class="btn btn-small" onclick={onclose}>Close</button>
  </div>
  <div class="viewer-canvas" bind:this={containerEl}></div>
  <div class="viewer-hint">Drag to orbit, scroll to zoom, arrow keys to navigate</div>
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
