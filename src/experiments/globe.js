// noinspection JSCheckFunctionSignatures

import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import createCanvas from "../createCanvas";
import {DEG2RAD} from "three/src/math/MathUtils";
import Stats from 'stats.js'
import * as dat from "dat.gui";

/**
 * Debug
 */
const gui = new dat.GUI({width: 400});

/**
 * Base
 */
const canvas = createCanvas();
const scene = new THREE.Scene();

class HeroGlobe {
  globeRadius = 1;
  dotRadius = this.globeRadius / 200;
  // dotRadius = this.globeRadius / 250;
  // dotRadius = this.globeRadius / 300;
  // rows = 180;
  rows = 200;
  // rows = 360;
  dotDensity = 60;
  dotMatrices = [];
  object = new THREE.Object3D();
  group = new THREE.Group();
  map = {};
  colors = {
    // glow: 0x1c2462,
    glow: 0xe17700,
    // dot: 0x376FFF,
    // dot: 0x00E1C6,
    // dot: 0xe17700,
    dot: 0xF7931A,
    // globe: 0x0B122E,
    // globe: 0x376FFF,
    // globe: 0x0000FF,
    // globe: 0x000000,
    globe: 0xffffff,
    // spotLight1: 0x2188ff,
    // spotLight1: 0x9BB7FF,
    // spotLight1: 0x4D4D4D,
    spotLight1: 0x919191,
    // spotLight2: 0xf46bbe,
    // spotLight2: 0x9BB7FF,
    // spotLight2: 0x4D4D4D,
    spotLight2: 0x919191,
    // directionalLight: 0xa9bfff,
    // directionalLight: 0xffffff,
    // directionalLight: 0x9BB7FF,
    // directionalLight: 0x4D4D4D,
    directionalLight: 0x919191,
  }

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

  latLongToVec3 = (lat, long, radius) => {
    const phi = (90 - lat) * DEG2RAD;
    const theta = (long + 180) * DEG2RAD;

    return [
      radius * Math.sin(phi) * Math.cos(theta) * -1,
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    ]
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

        const positions = this.latLongToVec3(lat, long, this.globeRadius);

        this.object.position.set(positions[0], positions[1], positions[2]);

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

        const lookAtPositions = this.latLongToVec3(lat, long, this.globeRadius + 5);
        this.object.lookAt(lookAtPositions[0], lookAtPositions[1], lookAtPositions[2]);
        this.object.updateMatrix();
        const matrix = this.object.matrix.clone();

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
    // const circleMaterial = new THREE.MeshBasicMaterial({color: 0x376FFF});

    const circleMaterial = new THREE.MeshStandardMaterial({
      color: this.colors.dot,
      // metalness: 1,
      metalness: 0,
      roughness: 0.9,
      transparent: true,
      alphaTest: .02
    });

    circleMaterial.onBeforeCompile = function (material) {
      const fadeThreshold = '0.2';
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
      // material.fragmentShader = material.fragmentShader.replace(
      //   "gl_FragColor = vec4( outgoingLight, diffuseColor.a );", `
      //   gl_FragColor = vec4( outgoingLight, diffuseColor.a );
      //   if (gl_FragCoord.z > 0.51) {
      //     gl_FragColor.a = 1.0 + ( 0.51 - gl_FragCoord.z ) * 17.0;
      //   }
      // `)
    }

    // TODO: Remove later for performance reasons
    // circleMaterial.side = THREE.DoubleSide;

    // We make use of instanced mesh here for performance reasons
    const dotMesh = new THREE.InstancedMesh(circleGeometry, circleMaterial, this.dotMatrices.length);

    this.dotMatrices.forEach((dotMatrix, i) => {
      dotMesh.setMatrixAt(i, dotMatrix);
    })
    dotMesh.renderOrder = 3;

    // Globe Sphere
    const globeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.globeRadius, 64, 64),
      new THREE.MeshStandardMaterial({
        // opacity: 0,
        // opacity: 0.05,
        // opacity: 0.5,
        // transparent: true,
        color: this.colors.globe,
        // metalness: 0,
        metalness: 1,
        roughness: .9
      })
    );

    const haloSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.globeRadius, 45, 45),
      new THREE.ShaderMaterial({
        uniforms: {
          c: {
            type: "f",
            value: .7,
          },
          p: {
            type: "f",
            value: 15,
          },
          glowColor: {
            type: "c",
            value: new THREE.Color(this.colors.glow),
          },
          viewVector: {
            type: "v3",
            value: new THREE.Vector3(0, 0, 220),
          }
        },
        vertexShader: `
          uniform vec3 viewVector;
          uniform float c;
          uniform float p;
          varying float intensity;
          varying float intensityA;
          void main() 
          {
            vec3 vNormal = normalize( normalMatrix * normal );
            vec3 vNormel = normalize( normalMatrix * viewVector );
            intensity = pow( c - dot(vNormal, vNormel), p );
            intensityA = pow( 0.63 - dot(vNormal, vNormel), p );
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }`,
        fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;
          varying float intensityA;
          void main()
          {
            gl_FragColor = vec4( glowColor * intensity, 1.0 * intensityA );
          }`,
        side: 1,
        blending: 2,
        transparent: true,
        dithering: true,
      })
    )

    haloSphere.scale.multiplyScalar(1.15);
    // haloSphere.rotateX(4 * DEG2RAD);
    // haloSphere.rotateY(4 * DEG2RAD);
    haloSphere.rotateX(0);
    haloSphere.rotateY(0);
    haloSphere.renderOrder = 3;

    const glowGui = gui.addFolder("glow");
    glowGui.open();
    glowGui.addColor(this.colors, "glow").name("glowColor").onChange(
      (value) => haloSphere.material.uniforms.glowColor.value.set(value)
    );
    glowGui
      .add(haloSphere.rotation, "x")
      .name("rotationX")
      .min(-0.03 * Math.PI)
      .max(0.03 * Math.PI)
      .step(0.01 * DEG2RAD);
    glowGui
      .add(haloSphere.rotation, "y")
      .name("rotationY")
      .min(-0.03 * Math.PI)
      .max(0.03 * Math.PI)
      .step(0.01 * DEG2RAD);

    const dotGui = gui.addFolder("dot");
    dotGui.open();
    dotGui.addColor(this.colors, "dot").name("color").onChange(
      (value) => circleMaterial.color.set(value)
    );
    dotGui.add(circleMaterial, "metalness").min(0).max(1).step(0.01);
    dotGui.add(circleMaterial, "roughness").min(0).max(1).step(0.01);


    const globeGui = gui.addFolder("globe");
    globeGui.open();
    globeGui.addColor(this.colors, "globe").name("color").onChange(
      (value) => globeSphere.material.color.set(value)
    )
    globeGui.add(globeSphere.material, "metalness").min(0).max(1).step(0.01);
    globeGui.add(globeSphere.material, "roughness").min(0).max(1).step(0.01);

    scene.add(haloSphere);

    this.group.add(globeSphere);
    this.group.add(dotMesh);
    this.group.rotation.y = 255 * DEG2RAD;

    this.renderLights();
  }

  addLightGui = (light, name) => {
    const lightGui = gui.addFolder(name);
    lightGui.open();
    lightGui.addColor(
      this.colors, name
    ).name("color").onChange((value) => light.color.set(value));
    lightGui.add(light, "intensity").min(0).max(15).step(0.1);
    lightGui.add(light.position, "x").min(-10).max(10).step(0.01);
    lightGui.add(light.position, "y").min(-10).max(10).step(0.01);
    lightGui.add(light.position, "z").min(-10).max(10).step(0.01);
  }

  /**
   * Lights
   */
  renderLights = () => {
    const spotLight1 = new THREE.SpotLight(
      this.colors.spotLight1,
      // 12,
      1.5,
      120,
      .3,
      0,
      1.1,
    );
    const spotLight2 = new THREE.SpotLight(
      this.colors.spotLight2,
      // 5,
      1.5,
      75,
      .5,
      0,
      1.25,
    );
    const directionalLight = new THREE.DirectionalLight(
      this.colors.directionalLight,
      // 3,
      2,
    );

    spotLight1.target = this.group;
    spotLight2.target = this.group;
    directionalLight.target = this.group;

    spotLight1.position.set(
      this.group.position.x - 2.5 * this.globeRadius,
      8,
      -4,
    );
    spotLight2.position.set(
      this.group.position.x + this.globeRadius,
      this.globeRadius,
      2 * this.globeRadius,
    );
    directionalLight.position.set(
      // this.group.position.x - 5,
      // this.group.position.y + 3,
      // 1,
      0,
      0,
      10,
    );

    this.addLightGui(spotLight1, "spotLight1");
    this.addLightGui(spotLight2, "spotLight2");
    this.addLightGui(directionalLight, "directionalLight");

    scene.add(spotLight1, spotLight2, directionalLight);
  }
}

function renderScene() {
  const fpsStats = new Stats();
  fpsStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(fpsStats.dom);

  const heroGlobe = new HeroGlobe();
  heroGlobe.renderGlobe().then(() => {
    scene.add(heroGlobe.group);

    /**
     * Sizes
     */
    const sizes = {
      width: window.innerWidth, height: window.innerHeight,
    };

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