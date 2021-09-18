import * as THREE from "three";
import { BufferAttribute } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import createCanvas from "../createCanvas";

// Canvas
const canvas = createCanvas();

// Scene
const scene = new THREE.Scene();

// Red cube
// const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);

// Time to create our own geometry:
/* const positionsArray = new Float32Array(9);
positionsArray[0] = 0;
positionsArray[1] = 0;
positionsArray[2] = 0;

positionsArray[3] = 0;
positionsArray[4] = 1;
positionsArray[5] = 0;

positionsArray[6] = 1;
positionsArray[7] = 0;
positionsArray[8] = 0; */

const geometry = new THREE.BufferGeometry();

/* const positionsArray = new Float32Array([
  0, 0, 0,
  0, 1, 0,
  1, 0, 0,
]); */
/* const positionsArray = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]);
const positionsAttribute = new THREE.BufferAttribute(positionsArray, 3);
geometry.setAttribute("position", positionsAttribute); */

const count = 500;
// count * number of vertices (three for a triangle) * number of coordinates (x,y,z)
const positionsArray = new Float32Array(count * 3 * 3);

for (let i = 0; i < count * 3 * 3; i++) {
  positionsArray[i] = (Math.random() - 0.5) * 2;
}

const positionsAttribute = new BufferAttribute(positionsArray, 3);
geometry.setAttribute("position", positionsAttribute);

const material = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

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
// controls.enabled = false;
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera aspect ratio
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Handle fullscreen logic
window.addEventListener("dblclick", () => {
  const fullscreenElement =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (!fullscreenElement) {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullScreen) {
      canvas.webkitRequestFullScreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
});

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
