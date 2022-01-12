// noinspection JSCheckFunctionSignatures

import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import createCanvas from "../createCanvas";
import {DEG2RAD} from "three/src/math/MathUtils";
import Stats from 'stats.js'

class HeroGlobe {
  globeRadius = 1;
  // dotRadius = this.globeRadius / 200;
  dotRadius = this.globeRadius / 250;
  // dotRadius = this.globeRadius / 300;
  // rows = 180;
  rows = 200;
  // rows = 360;
  dotDensity = 60;
  dotMatrices = [];
  position = new THREE.Vector3();
  rotation = new THREE.Euler();
  quaternion = new THREE.Quaternion();
  scale = new THREE.Vector3(1, 1, 1);
  group = new THREE.Group();
  map = {};

  /**
   * HTML Canvas Image Manipulation Logic
   */
  initImageData = () => {
    return new Promise((resolve, reject) => {
      try {
        // Create a new Image instance
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/textures/map.png';
        img.onload = () => {
          this.map.width = img.width;
          this.map.height = img.height;

          // Create a canvas element
          const imageCanvas = document.createElement('canvas');
          imageCanvas.width = this.map.width;
          imageCanvas.height = this.map.height;

          // Get the drawing context
          const imageCtx = imageCanvas.getContext('2d');

          imageCtx.drawImage(img, 0, 0);
          img.style.display = 'none';

          this.map.imageData = imageCtx.getImageData(0, 0, this.map.width, this.map.height);
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
    const x = parseInt((long + 180) / 360 * this.map.width);
    const y = parseInt((-lat + 90) / 180 * this.map.height);
    // Alternative method for calculating y projection
    // const y = this.map.height - parseInt((lat + 90) / 180 * this.map.height);

    const index = (x + y * this.map.width) * 4 + 3;
    const alpha = this.map.imageData.data[index]
    return alpha > 90;
  }

  /**
   * Region Plotting Logic
   */
  plotGlobe = async () => {
    await this.initImageData();

    for (let lat = -90; lat <= 90; lat += 180 / this.rows) {
      const radius = Math.cos(Math.abs(lat) * DEG2RAD) * this.globeRadius;
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

        this.position.x = -(this.globeRadius * Math.sin(phi) * Math.cos(theta));
        this.position.z = (this.globeRadius * Math.sin(phi) * Math.sin(theta));
        this.position.y = (this.globeRadius * Math.cos(phi));

        this.rotation.x = 0;
        this.rotation.y = 0;
        this.rotation.z = 0;

        this.quaternion.setFromEuler(this.rotation);

        const matrix = new THREE.Matrix4();
        matrix.compose(this.position, this.quaternion, this.scale)
        matrix.lookAt(
          this.position,
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 1, 0)
        );

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
    const circleMaterial = new THREE.MeshStandardMaterial({
      color: 0x376FFF,
      metalness: 1,
      roughness: 0.9,
      transparent: true,
      alphaTest: .02
    });

    circleMaterial.onBeforeCompile = function (material) {
      const fadeThreshold = '1000.0';
      const alphaFallOff = '15.0';

      material.fragmentShader = material.fragmentShader.replace(
        "#include <output_fragment>",
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
        `
      )
    }

    // TODO: Remove later for performance reasons
    circleMaterial.side = THREE.DoubleSide;

    // We make use of instanced mesh here for performance reasons
    const dotMesh = new THREE.InstancedMesh(circleGeometry, circleMaterial, this.dotMatrices.length);

    this.dotMatrices.forEach((dotMatrix, i) => {
      dotMesh.setMatrixAt(i, dotMatrix);
    })

    // Globe Sphere
    const globeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.globeRadius, 64, 64),
      new THREE.MeshBasicMaterial({
        // opacity: 0,
        // opacity: 0.05,
        opacity: 0.5,
        // opacity: 1,
        transparent: true,
        color: 0x0B122E,
      })
    );

    this.group.add(globeSphere);
    this.group.add(dotMesh);
    this.group.rotation.y = 255 * DEG2RAD;
  }
}

function renderScene() {
  const fpsStats = new Stats();
  fpsStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(fpsStats.dom);

  /**
   * Base
   */
  const canvas = createCanvas();
  const scene = new THREE.Scene();

  const heroGlobe = new HeroGlobe();
  heroGlobe.renderGlobe().then(() => {
    scene.add(heroGlobe.group);

    /**
     * Lights
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 5);
    pointLight.position.x = 0;
    pointLight.position.y = 0;
    pointLight.position.z = 10;
    scene.add(pointLight);

    /**
     * Sizes
     */
    const sizes = {
      width: window.innerWidth, height: window.innerHeight,
    };

    /**
     * Camera
     */
    /**
     * Camera
     */
    const camera = new THREE.PerspectiveCamera(
      20,
      sizes.width / sizes.height,
      7,
      10
    );
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 8;
    scene.add(camera);

    // Controls
    // const controls = new OrbitControls(camera, canvas);
    // controls.enableDamping = true;

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
      heroGlobe.group.rotateY(0.05 * DEG2RAD);

      // Update controls
      // controls.update();

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