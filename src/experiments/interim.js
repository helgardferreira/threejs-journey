import * as THREE from 'three'
import {DEG2RAD, RAD2DEG} from 'three/src/math/MathUtils'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'

import Stats from 'stats.js'
import * as dat from 'dat.gui'

import createCanvas from "../createCanvas";
import worldMap from '/static/textures/map.png'
import data from './curated-countries.json'

const latLongToVector3 = (lat, long, radius) => {
  const phi = (90 - lat) * DEG2RAD
  const theta = (long + 180) * DEG2RAD

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta) * -1,
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

// function courtesy of https://github.com/chrisveness/geodesy
const calculateMidwayPoint = (lat1, long1, lat2, long2) => {
  lat1 *= DEG2RAD
  long1 *= DEG2RAD
  lat2 *= DEG2RAD
  long2 *= DEG2RAD

  const deltaLong = long2 - long1
  const Bx = Math.cos(lat2) * Math.cos(deltaLong)
  const By = Math.cos(lat2) * Math.sin(deltaLong)

  const midLat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By),
  )
  const midLong = long1 + Math.atan2(By, Math.cos(lat1) + Bx)

  return [midLat * RAD2DEG, midLong * RAD2DEG]
}

const normalize = (value, min, max, a, b) => {
  // Will always give a value between 0 and 1
  const normalizedValue = (value - min) / (max - min) || 0
  return (b - a) * normalizedValue + a
}

class Path {
  constructor(data, radius, disposeCallback = () => {
  }) {
    this.data = data
    const startVector = latLongToVector3(
      this.data.startLocation.lat,
      this.data.startLocation.long,
      radius,
    )
    const endVector = latLongToVector3(
      this.data.endLocation.lat,
      this.data.endLocation.long,
      radius,
    )

    const tubeDistance = startVector.distanceTo(endVector)

    const arcHeight = normalize(
      tubeDistance,
      0,
      2 * radius,
      radius,
      tubeDistance > 1.8 * radius ? 2 : tubeDistance > 1.4 * radius ? 1.7 : 1.6,
    )

    const midVector = latLongToVector3(
      ...calculateMidwayPoint(
        this.data.startLocation.lat,
        this.data.startLocation.long,
        this.data.endLocation.lat,
        this.data.endLocation.long,
      ),
      radius * arcHeight,
    )

    const controlPoint1 = new THREE.Vector3().copy(midVector)
    const controlPoint2 = new THREE.Vector3().copy(midVector)

    const t1 = 0.15
    const t2 = 0.85

    const interimBezier = new THREE.CubicBezierCurve3(
      startVector,
      controlPoint1,
      controlPoint2,
      endVector,
    )

    interimBezier.getPoint(t1, controlPoint1)
    interimBezier.getPoint(t2, controlPoint2)
    controlPoint1.multiplyScalar(arcHeight)
    controlPoint2.multiplyScalar(arcHeight)

    this.bezier = new THREE.CubicBezierCurve3(
      startVector,
      controlPoint1,
      controlPoint2,
      endVector,
    )

    const tubeSegmentLength = parseInt(100 * this.bezier.getLength())
    this.line = new THREE.Mesh(
      new THREE.TubeGeometry(this.bezier, tubeSegmentLength, 0.004, 3, false),
      new THREE.MeshBasicMaterial({
        // color: 0xf7931a,
        color: 0x00e1c6,
      }),
    )
    this.line.name = 'line'

    this.hitbox = new THREE.Mesh(
      new THREE.TubeGeometry(this.bezier, tubeSegmentLength, 0.04, 3, false),
      new THREE.MeshBasicMaterial({
        transparent: true,
        // color: 'black',
        opacity: 0,
      }),
    )

    this.sphere = new THREE.Mesh(
      // new THREE.CylinderGeometry(0.015, 0.015, 0.01, 14),
      new THREE.SphereGeometry(0.015),
      new THREE.MeshBasicMaterial({
        // color: 0xf7931a,
        color: 0x00e1c6,
      }),
    )
    this.sphere.position.copy(this.bezier.getPointAt(0))
    this.sphere.name = 'sphere'

    this.group = new THREE.Group()
    this.group.add(this.sphere)
    this.group.add(this.line)
    this.group.add(this.hitbox)
    this.group.name = this.data.label
    this.uuid = this.group.uuid

    this.line.geometry.setDrawRange(0, 0)
    this.hitbox.geometry.setDrawRange(0, 0)
    this.renderCount = 0
    this.deRenderCount = 0
    this.animationSpeed = Math.ceil((18 * this.bezier.getLength()) / 9) * 3
    this.minPauseTime = (this.animationSpeed / 18) * 540
    this.isAnimating = true

    this.disposeCallback = () => disposeCallback(this.uuid)
  }

  dispose = () => {
    this.disposeCallback()
    const disposeChildren = (o) => {
      if (o.dispose) {
        o.dispose()
      }
    }
    this.line.traverse(disposeChildren)
    this.hitbox.traverse(disposeChildren)
    this.sphere.traverse(disposeChildren)
    this.group.remove(this.line, this.hitbox, this.sphere)
  }

  setIsHover = (isHover) => {
    this.isAnimating = !isHover
    this.line.material.color.set(isHover ? 0xffffff : 0x00e1c6)
    this.sphere.material.color.set(isHover ? 0xffffff : 0x00e1c6)
  }

  update = () => {
    // NB: for non-indexed buffer geometry: geometry.index.count is the amount of vertices to render
    // each face has two triangles which equates to 6 vertices...
    // so 3 radial segments and 1 length segment equates to 18 total vertices
    if (this.isAnimating) this.renderCount += this.animationSpeed

    if (this.renderCount > this.line.geometry.index.count)
      this.sphere.visible = false

    if (this.renderCount <= this.line.geometry.index.count) {
      this.sphere.position.copy(
        this.bezier.getPointAt(
          normalize(this.renderCount, 0, this.line.geometry.index.count, 0, 1),
        ),
      )

      this.line.geometry.setDrawRange(0, this.renderCount)
      this.hitbox.geometry.setDrawRange(0, this.renderCount)
    }
    // Pause factor
    else if (
      this.renderCount >= this.line.geometry.index.count + this.minPauseTime &&
      this.deRenderCount <= this.line.geometry.index.count
    ) {
      if (this.isAnimating) this.deRenderCount += this.animationSpeed

      this.line.geometry.setDrawRange(this.deRenderCount, Infinity)
      this.hitbox.geometry.setDrawRange(this.deRenderCount, Infinity)

      if (this.deRenderCount >= this.line.geometry.index.count) {
        this.dispose()
      }
    }
  }
}

class DataDisplay {
  constructor() {
    this.element = document.createElement('div')
    this.element.style.position = 'absolute'
    this.element.style.top = '0'
    this.element.style.left = '0'
    this.element.style.maxWidth = '300px'
    this.element.style.backgroundColor = '#0B122E'
    this.element.style.border = '1px solid #6B718A'
    this.element.style.fontFamily = "'Roboto', sans-serif"
    this.element.style.fontSize = '16px'
    this.element.style.color = '#FFFFFF'
    this.element.style.display = 'none'
    this.element.style.padding = '16px'
    this.element.style.borderRadius = '2px'
    document.body.append(this.element)
    this.isVisible = false
  }

  setData = (data) => {
    if (data) {
      this.element.innerHTML = `
      <p>${data.label}</p>
    `
    }
  }

  show = () => {
    if (this.isVisible) return
    this.element.style.display = 'block'
    this.isVisible = true
  }

  hide = () => {
    if (!this.isVisible) return
    this.element.style.display = 'none'
    this.isVisible = false
  }

  update = (mouse) => {
    const {width, height} = this.element.getBoundingClientRect()
    const x = Math.min(mouse.x, window.innerWidth - width - 10)
    const y = Math.min(mouse.y + 20, window.innerHeight - height - 10)
    this.element.style.transform = `translate(${x}px, ${y}px)`
  }

  dispose = () => {
    document.body.removeChild(this.element)
  }
}

export class Globe {
  constructor(props) {
    this.props = props
    this.globeRadius = 1
    this.dotRadius = this.globeRadius / 200
    this.rows = 200
    this.dotDensity = 50
    this.dotMatrices = []
    this.enableLights = props.enableLights
    this.sceneSizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    if (this.props.debug) {
      this.gui = new dat.GUI({width: 400})
      this.gui.close()
    }

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      20,
      this.sceneSizes.width / this.sceneSizes.height,
      1,
      100,
    )

    this.scene.add(this.camera)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.props.canvas,
      alpha: true,
    })
    this.renderer.setSize(this.sceneSizes.width, this.sceneSizes.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Controls
    this.controls = new OrbitControls(this.camera, this.props.canvas)
    this.controls.enableDamping = true
    this.controls.enableZoom = false
    this.controls.enablePan = false

    this.camera.position.x = 0
    this.camera.position.y = 0
    this.camera.position.z = 8

    if (this.props.debug) {
      const cameraGui = this.gui.addFolder('camera')
      cameraGui.add(this.camera.position, 'x').min(0).max(10).step(0.01)
      cameraGui.add(this.camera.position, 'y').min(0).max(10).step(0.01)
      cameraGui.add(this.camera.position, 'z').min(0).max(10).step(0.01)
    }

    this.object = new THREE.Object3D()
    this.group = new THREE.Group()
    this.uuid = this.group.uuid
    this.map = {}
    this.colors = {
      glow: 0x1c2462,
      // glow: 0x1c2462,
      dot: 0x376fff,
      globe: 0x0b122e,
      // globe: 0x000000,
      // globe: 0x00007f,
      // globe: 0x1d3782,
      // globe: 0x376fff,
      // globe: 0xf1f1f1,
      spotLight1: 0x2188ff,
      spotLight2: 0xf46bbe,
      spotLight3: 0xff0092,
      directionalLight: 0xa9bfff,
    }

    this.stopAnimation = false

    if (this.props.debug) {
      this.stats = new Stats()
      this.stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
      document.body.appendChild(this.stats.dom)
    }

    this.pathMap = new Map()
    this.maxPaths = 12
    this.raycaster = new THREE.Raycaster()
    // Off-screen by default
    this.mouse = new THREE.Vector2(-100, -100)
    this.screenMouse = new THREE.Vector2()

    this.dataDisplay = new DataDisplay()
  }

  /**
   * HTML Canvas Image Manipulation Logic
   */
  initImageData = () => {
    return new Promise((resolve, reject) => {
      try {
        // Create a new Image instance
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = worldMap
        img.onload = () => {
          this.map.width = img.width
          this.map.height = img.height

          // Create a canvas element for image processing
          const imageCanvas = document.createElement('canvas')
          imageCanvas.width = this.map.width
          imageCanvas.height = this.map.height

          // Get the drawing context
          const imageCtx = imageCanvas.getContext('2d')

          imageCtx.drawImage(img, 0, 0)
          img.style.display = 'none'

          this.map.imageData = imageCtx.getImageData(
            0,
            0,
            this.map.width,
            this.map.height,
          )
          resolve()
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Equirectangular map image processing
   */
  isDotVisible = (lat, long) => {
    const x = parseInt(((long + 180) / 360) * this.map.width)
    const y = parseInt(((-lat + 90) / 180) * this.map.height)
    // Alternative method for calculating y projection
    // const y = this.map.height - parseInt((lat + 90) / 180 * this.map.height);

    const index = (x + y * this.map.width) * 4 + 3
    const alpha = this.map.imageData.data[index]
    return alpha > 90
  }

  /**
   * Region Plotting Logic
   */
  plotGlobe = async () => {
    await this.initImageData()

    for (let lat = -90; lat <= 90; lat += 180 / this.rows) {
      const radius = Math.cos(Math.abs(lat) * DEG2RAD) * this.globeRadius
      const circumference = radius * Math.PI * 2
      const dotsForLat = circumference * this.dotDensity

      for (let x = 0; x < dotsForLat; x++) {
        const long = -180 + (x * 360) / dotsForLat

        if (!this.isDotVisible(lat, long)) continue

        this.object.position.copy(latLongToVector3(lat, long, this.globeRadius))

        // Alternate method for creating "dot" matrix
        // this.position.set();
        //
        // this.rotation.x = 0;
        // this.rotation.y = 0;
        // this.rotation.z = 0;
        //
        // this.quaternion.setFromEuler(this.rotation);
        //
        // const matrix = new THREE.Matrix4();
        // matrix.compose(this.position, this.quaternion, this.scale)
        // matrix.lookAt(
        //   this.position,
        //   new THREE.Vector3(0, 0, 0),
        //   new THREE.Vector3(0, 1, 0)
        // );

        this.object.lookAt(latLongToVector3(lat, long, this.globeRadius + 5))
        this.object.updateMatrix()
        const matrix = this.object.matrix.clone()

        this.dotMatrices.push(matrix)
      }
    }
  }

  /**
   * Region Dot Rendering
   */
  renderGlobe = () => {
    this.plotGlobe().then(() => {
      const circleGeometry = new THREE.CircleGeometry(this.dotRadius, 5)
      const circleMaterial = new THREE.MeshBasicMaterial({color: 0x376fff})

      if (this.enableLights) {
        circleMaterial.onBeforeCompile = function (material) {
          const fadeThreshold = '0.2'
          const alphaFallOff = '15.0'

          material.fragmentShader = material.fragmentShader.replace(
            '#include <output_fragment>',
            `
          #ifdef OPAQUE
          diffuseColor.a = 1.0;
          #endif
          #ifdef USE_TRANSMISSION
          diffuseColor.a *= transmissionAlpha + 0.1;
          #endif
          gl_FragColor = vec4( outgoingLight, diffuseColor.a );
          if (gl_FragCoord.z > ${fadeThreshold}) {
            gl_FragColor.a = 1.0 + ( ${fadeThreshold} - gl_FragCoord.z ) * ${alphaFallOff};
          }
        `,
          )
        }
      }

      circleMaterial.side = THREE.DoubleSide

      // We make use of instanced mesh here for performance reasons
      const dotMesh = new THREE.InstancedMesh(
        circleGeometry,
        circleMaterial,
        this.dotMatrices.length,
      )

      this.dotMatrices.forEach((dotMatrix, i) => {
        dotMesh.setMatrixAt(i, dotMatrix)
      })
      dotMesh.renderOrder = 3

      // Globe Sphere
      const globeSphere = new THREE.Mesh(
        new THREE.SphereGeometry(this.globeRadius, 64, 64),
        this.enableLights
          ? new THREE.MeshStandardMaterial({
            color: this.colors.globe,
            metalness: 0,
            roughness: 0.9,
          })
          : new THREE.MeshBasicMaterial({
            color: this.colors.globe,
            transparent: true,
            opacity: 0.5,
          }),
      )

      if (this.props.debug) {
        const dotGui = this.gui.addFolder('dot')
        dotGui
          .addColor(this.colors, 'dot')
          .name('color')
          .onChange((value) => circleMaterial.color.set(value))
        if (this.enableLights) {
          dotGui.add(circleMaterial, 'metalness').min(0).max(1).step(0.01)
          dotGui.add(circleMaterial, 'roughness').min(0).max(1).step(0.01)
        }

        const globeGui = this.gui.addFolder('globe')
        globeGui
          .addColor(this.colors, 'globe')
          .name('color')
          .onChange((value) => globeSphere.material.color.set(value))
        globeGui.add(globeSphere.material, 'opacity').min(0).max(1).step(0.01)
        if (this.enableLights) {
          globeGui
            .add(globeSphere.material, 'metalness')
            .min(0)
            .max(1)
            .step(0.01)
          globeGui
            .add(globeSphere.material, 'roughness')
            .min(0)
            .max(1)
            .step(0.01)
        }
      }

      this.group.add(globeSphere)
      this.group.add(dotMesh)

      // Rotate Africa to display first
      this.group.rotation.y = 255 * DEG2RAD
      this.scene.add(this.group)

      this.renderLights()
      this.renderPaths()

      this.renderAnimation()

      // TODO: Refactor
      window.addEventListener(
        'mousemove',
        this.mouseMoveHandler,
      )

      window.addEventListener('resize', this.resizeCanvasHandler)
    })
  }

  resizeCanvasHandler = () => {
    this.sceneSizes.width = window.innerWidth
    this.sceneSizes.height = window.innerHeight

    // Update camera
    this.camera.aspect = this.sceneSizes.width / this.sceneSizes.height
    this.camera.updateProjectionMatrix()

    // Update renderer
    this.renderer.setSize(this.sceneSizes.width, this.sceneSizes.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  mouseMoveHandler = (event) => {
    this.screenMouse.x = event.pageX
    this.screenMouse.y = event.pageY

    this.mouse.x =
      (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y =
      -(event.clientY / window.innerHeight) * 2 + 1

  }

  addLightGui = (light, name) => {
    const lightGui = this.gui.addFolder(name)
    lightGui
      .addColor(this.colors, name)
      .name('color')
      .onChange((value) => light.color.set(value))
    lightGui.add(light, 'intensity').min(0).max(15).step(0.1)
    lightGui.add(light.position, 'x').min(-10).max(10).step(0.01)
    lightGui.add(light.position, 'y').min(-10).max(10).step(0.01)
    lightGui.add(light.position, 'z').min(-10).max(10).step(0.01)
  }

  /**
   * Lights
   */
  renderLights = () => {
    const spotLight1 = new THREE.SpotLight(
      this.colors.spotLight1,
      6,
      120,
      0.3,
      0,
      1.1,
    )
    const spotLight2 = new THREE.SpotLight(
      this.colors.spotLight2,
      4,
      75,
      0.5,
      0,
      1.25,
    )
    const spotLight3 = new THREE.SpotLight(
      this.colors.spotLight3,
      4,
      75,
      0.5,
      0,
      1.25,
    )
    const directionalLight = new THREE.DirectionalLight(
      this.colors.directionalLight,
      1.5,
    )

    spotLight1.target = this.group
    spotLight2.target = this.group
    spotLight3.target = this.group
    directionalLight.target = this.group

    spotLight1.position.set(
      this.group.position.x - 2.5 * this.globeRadius,
      8,
      -4,
    )
    spotLight2.position.set(
      this.group.position.x + this.globeRadius,
      this.globeRadius,
      2 * this.globeRadius,
    )
    spotLight3.position.set(
      (this.group.position.x + this.globeRadius) * 2,
      -this.globeRadius - 3,
      2 * this.globeRadius,
    )
    directionalLight.position.set(
      this.group.position.x - 1,
      this.group.position.y,
      2,
    )

    if (this.props.debug) {
      this.addLightGui(spotLight1, 'spotLight1')
      this.addLightGui(spotLight2, 'spotLight2')
      this.addLightGui(spotLight3, 'spotLight3')
      this.addLightGui(directionalLight, 'directionalLight')
    }

    this.scene.add(spotLight1, spotLight2, spotLight3, directionalLight)
  }

  renderPaths() {
    const pathData = [...new Array(150).keys()].map((d) => {
      const startIndex = Math.floor(Math.random() * 105)
      let endIndex = Math.floor(Math.random() * 105)

      while (startIndex === endIndex) {
        endIndex = Math.floor(Math.random() * 105)
      }

      const startLocation = data[startIndex]
      const endLocation = data[endIndex]

      return {
        startLocation,
        endLocation,
        label: `${startLocation.city}, ${startLocation.country} To ${endLocation.city}, ${endLocation.country}`,
      }
    })

    let intervalCount = 0
    this.pathInterval = setInterval(() => {
      if (pathData.length === 0) return clearInterval(this.pathInterval)
      // const data = pathData.pop()
      intervalCount = (intervalCount + 1) % pathData.length

      const alreadyExists =
        Array.from(this.pathMap.values()).findIndex(
          (v) => v.group.name === pathData[intervalCount].label,
        ) > -1

      if (!alreadyExists && this.pathMap.size < this.maxPaths) {
        const path = new Path(
          pathData[intervalCount],
          this.globeRadius,
          (uuid) => this.pathMap.delete(uuid),
        )
        this.pathMap.set(path.uuid, path)
        this.group.add(path.group)
      }
    }, 200)
  }

  update = () => {
    this.pathMap.forEach((mesh) => mesh.update())

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.group.children)

    if (intersects.length > 0) {
      const parent = intersects[0]?.object?.parent
      if (
        intersects[0].object !== this.intersected?.object &&
        this.currentPath
      ) {
        this.props.canvas.style.cursor = ''
        this.currentPath.setIsHover(false)
      }

      if (parent.name) {
        if (parent.uuid !== this.currentPath?.group?.uuid) {
          this.currentPath = this.pathMap.get(parent.uuid)
          this.dataDisplay.setData(this.currentPath?.data)
        }
        if (this.currentPath) {
          this.props.canvas.style.cursor = 'pointer'
          this.currentPath.setIsHover(true)
        }
      }

      this.intersected = intersects[0]

      if (parent.name) {
        this.dataDisplay.show()
        this.dataDisplay.update(this.screenMouse)
      } else {
        this.dataDisplay.hide()
      }
    }

    if (
      intersects.length === 0 ||
      !this.intersected ||
      !this.intersected?.object?.parent?.name
    ) {
      if (this.currentPath) {
        this.props.canvas.style.cursor = ''
        this.currentPath.setIsHover(false)
      }
      this.dataDisplay.hide()

      this.group.rotateY(0.1 * DEG2RAD)
    }
  }

  renderAnimation = () => {
    if (this.stopAnimation) {
      return
    }
    // WebGL Stats
    this.stats && this.stats.begin()

    // const elapsedTime = clock.getElapsedTime();

    if (this.controls.enabled) this.controls.update()

    this.update()

    this.renderer.render(this.scene, this.camera)

    this.stats && this.stats.end()

    // Call renderAnimation again on the next frame
    window.requestAnimationFrame(this.renderAnimation)
  }

  dispose = () => {
    this.stopAnimation = true
    this.renderer.dispose()
    this.dataDisplay.dispose()

    clearInterval(this.pathInterval)
    window.removeEventListener(
      'mousemove',
      this.mouseMoveHandler,
    )
    window.removeEventListener(
      'resize',
      this.resizeCanvasHandler
    )

    if (this.props.debug) {
      document.body.removeChild(this.stats.dom)
      document.body.removeChild(this.gui.domElement)
      this.gui.destroy()
    }

    console.log('disposed', new Date().toString())
  }
}

const canvas = createCanvas();

const globe = new Globe({
  canvas,
  enableLights: false,
  enableHalo: false,
  debug: true
})

globe.renderGlobe()
