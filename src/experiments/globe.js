import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import createCanvas from "../createCanvas";
import {DEG2RAD} from "three/src/math/MathUtils";
import {MeshBasicMaterial} from "three";
import Stats from 'stats.js'

const fpsStats = new Stats();
fpsStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(fpsStats.dom);

/**
 * Base
 */
// Canvas
const canvas = createCanvas();

// Scene
const scene = new THREE.Scene();

// Globe
const GLOBE_RADIUS = 1;
const globeSphere = new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
  new MeshBasicMaterial({
    opacity: 0.05,
    transparent: true,
    color: 0x0B122E
  }),
  // mapMaterial,
);

class HeroGlobe {
  dotRadius = (2 * Math.PI * GLOBE_RADIUS) / 1500;
  rows = 180;
  dotDensity = 100;
  dotMatrices = [];
  position = new THREE.Vector3();
  rotation = new THREE.Euler();
  quaternion = new THREE.Quaternion();
  scale = new THREE.Vector3(1, 1, 1);
  group = new THREE.Group();
  imageData;

  /**
   * HTML Canvas Image Manipulation Logic
   */
  initImageData = () => {
    return new Promise((resolve, reject) => {
      try {
        // Create a canvas element
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = 400;
        imageCanvas.height = 200;

        // Get the drawing context
        const imageCtx = imageCanvas.getContext('2d');

        // Create a new Image instance
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/textures/map.png';
        img.onload = () => {
          imageCtx.drawImage(img, 0, 0);
          img.style.display = 'none';

          this.imageData = imageCtx.getImageData(0, 0, 400, 200);
          resolve();
        };
      } catch (err) {
        reject(err);
      }
    })
  }

  /**
   * Equirectangular map image processing
   */
  isDotVisible = (lat, long) => {
    // 400 = map width
    // 200 = map height
    const x = ((long + 180) * (400 / 360));
    const y = (((lat * -1) + 90) * (200 / 180));

    // 400 = image width
    const index = (Math.floor(x) + Math.floor(y) * 400) * 4;
    const alpha = this.imageData.data[index + 3]
    return alpha >= 90;
  }

  /**
   * Region Plotting Logic
   */
  plotGlobe = async () => {
    await this.initImageData();

    for (let lat = -90; lat <= 90; lat += 180 / this.rows) {
      const radius = Math.cos(Math.abs(lat) * DEG2RAD) * GLOBE_RADIUS;
      const circumference = radius * Math.PI * 2;
      const dotsForLat = circumference * this.dotDensity;

      for (let x = 0; x < dotsForLat; x++) {
        const long = -180 + x * 360 / dotsForLat;

        if (!this.isDotVisible(lat, long)) {
          continue;
        }

        // Alternative x,y,z calculation
        const phi = (90 - lat) * DEG2RAD;
        const theta = (long + 180) * DEG2RAD;

        this.position.x = -(GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta));
        this.position.z = (GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta));
        this.position.y = (GLOBE_RADIUS * Math.cos(phi));

        this.rotation.x = 0;
        this.rotation.y = 0;
        this.rotation.z = 0;

        this.quaternion.setFromEuler(this.rotation);

        const matrix = new THREE.Matrix4();
        matrix.compose(
          this.position, this.quaternion, this.scale
        )
        matrix.lookAt(this.position, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));

        this.dotMatrices.push(matrix);
      }
    }
  }

  /**
   * Region Dot Rendering
   */
  renderGlobe = async () => {
    await this.plotGlobe();

    const circleGeometry = new THREE.CircleGeometry(this.dotRadius, 5);
    const circleMaterial = new THREE.MeshBasicMaterial({color: 0x376FFF});

    // TODO: Remove later for performance reasons
    circleMaterial.side = THREE.DoubleSide;

    // We make use of instanced mesh here for performance reasons
    const dotMesh = new THREE.InstancedMesh(circleGeometry, circleMaterial, this.dotMatrices.length);

    this.dotMatrices.forEach((dotMatrix, i) => {
      dotMesh.setMatrixAt(i, dotMatrix);
    })

    this.group.add(globeSphere);
    this.group.add(dotMesh);
    this.group.rotation.y = 255 * DEG2RAD;
  }
}

function renderScene() {
  const heroGlobe = new HeroGlobe();
  heroGlobe.renderGlobe().then(() => {
    scene.add(heroGlobe.group);

    /**
     * Lights
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.x = 2;
    pointLight.position.y = 2;
    pointLight.position.z = 2;
    scene.add(pointLight);

    /**
     * Sizes
     */
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    /**
     * Camera
     */
      // Base camera
    const camera = new THREE.PerspectiveCamera(
        75,
        sizes.width / sizes.height,
        0.1,
        100
      );
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 2;
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true});
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /**
     * Animate
     */
    const clock = new THREE.Clock();

    window.addEventListener("resize", () => {
      // Update sizes
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      // Update camera
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    const renderAnimation = () => {
      // WebGL Stats
      fpsStats.begin();

      // const elapsedTime = clock.getElapsedTime();

      // Bind animation to elapsedTime to reduce FPS inconsistencies
      heroGlobe.group.rotateY(0.5 * DEG2RAD)

      // Update controls
      controls.update();

      // Render
      renderer.render(scene, camera);

      fpsStats.end();

      // Call renderAnimation again on the next frame
      window.requestAnimationFrame(renderAnimation);
    };

    renderAnimation();
  })
}

renderScene();