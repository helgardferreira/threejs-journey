import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import * as dat from "dat.gui";
import createCanvas from "../createCanvas";

/**
 * Debug
 */
const gui = new dat.GUI({ width: 400 });

const parameters = {
  color: 0xff0000,
};

const debugActions = gui.addFolder("actions");
debugActions.open();

// Canvas
const canvas = createCanvas();

// Scene
const scene = new THREE.Scene();

/**
 * Red Cube
 */
// Mesh
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: parameters.color });
const redCube = new THREE.Mesh(geometry, material);
scene.add(redCube);

// Debug
const debugRedCube = gui.addFolder("Red Cube");
debugRedCube.open();

debugRedCube.add(redCube.position, "y").min(-3).max(3).step(0.01);
debugRedCube.add(redCube, "visible");
debugRedCube.add(material, "wireframe");
debugRedCube
  .addColor(parameters, "color")
  .onChange((value) => material.color.set(value));

parameters.spin = () =>
  gsap.to(redCube.rotation, {
    duration: 1,
    y: redCube.rotation.y + Math.PI * 2,
  });
debugActions.add(parameters, "spin");

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

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

// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.z = 3;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Animate
const clock = new THREE.Clock();

const renderAnimation = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call renderAnimation again on the next frame
  window.requestAnimationFrame(renderAnimation);
};

renderAnimation();
