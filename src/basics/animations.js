import * as THREE from "three";
import gsap from "gsap";

import createCanvas from "../createCanvas";

// Sizes
const sizes = {
  width: 800,
  height: 600,
};

// Scene
const scene = new THREE.Scene();

// Object
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const redCube = new THREE.Mesh(geometry, material);
scene.add(redCube);

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 3;
scene.add(camera);

// Renderer
const canvas = createCanvas();
const renderer = new THREE.WebGLRenderer({
  canvas,
});
renderer.setSize(sizes.width, sizes.height);

// Animations
const clock = new THREE.Clock();

// Animations with GSAP
/* gsap.to(redCube.position, { x: 2, duration: 1, delay: 1 });
gsap.to(redCube.position, { x: 0, duration: 1, delay: 2 }); */

const renderAnimation = () => {
  // Time
  const elapsedTime = clock.getElapsedTime();

  // Update objects
  // One full rotation per second
  // redCube.rotation.y = elapsedTime * Math.PI * 2;
  // Moving in a sinusoidal motion
  redCube.position.x = Math.cos(elapsedTime);
  redCube.position.y = Math.sin(elapsedTime);
  camera.lookAt(redCube.position);

  // Render
  renderer.render(scene, camera);

  requestAnimationFrame(renderAnimation);
};

renderAnimation();
