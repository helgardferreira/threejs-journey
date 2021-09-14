import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";

import createCanvas from "../createCanvas";

// Sizes
const sizes = {
  width: 800,
  height: 600,
};

// Cursor
const cursor = {
  x: 0,
  y: 0,
};
// Map client's cursor movement to x and y cursor properties
window.addEventListener("mousemove", (event) => {
  // cursor.x = event.clientX / window.innerWidth - 0.5;
  cursor.x =
    gsap.utils.clamp(
      0,
      800,
      event.clientX - (window.innerWidth - sizes.width) / 2
    ) /
      sizes.width -
    0.5;
  cursor.y = -(
    gsap.utils.clamp(
      0,
      600,
      event.clientY - (window.innerHeight - sizes.height) / 2
    ) /
      sizes.height -
    0.5
  );
});

// Scene
const scene = new THREE.Scene();

// Object - Red Cube
const redCube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1, 5, 5, 5),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(redCube);

// Camera
const aspectRatio = sizes.width / sizes.height;
const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 100);
/* const camera = new THREE.OrthographicCamera(
  -1 * aspectRatio,
  1 * aspectRatio,
  1,
  -1,
  0.1,
  100
); */
// camera.position.x = 2;
// camera.position.y = 2;
camera.position.z = 3;
scene.add(camera);

const canvas = createCanvas();

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
/* controls.target.y = 1;
controls.update(); */

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);

// Animate
const clock = new THREE.Clock();

const renderAnimation = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update objects
  /* redCube.rotation.y = elapsedTime; */

  // Update camera
  // Simple, stationary, first-person camera movement
  /* camera.lookAt(cursor.x * 5, cursor.y * 5, 0); */
  // Move camera in xy plane w.r.t. cursor while looking at the red cube
  /* camera.position.x = Math.sin(cursor.x * Math.PI * 2) * 3;
  camera.position.z = Math.cos(cursor.x * Math.PI * 2) * 3;
  camera.position.y = cursor.y * 5;
  camera.lookAt(redCube.position); */

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(renderAnimation);
};

renderAnimation();
