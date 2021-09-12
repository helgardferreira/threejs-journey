import * as THREE from "three";
import createCanvas from "./createCanvas";
import "./index.css";

const scene = new THREE.Scene();

// Red cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const redCube = new THREE.Mesh(geometry, material);

scene.add(redCube);

// Sizes
const sizes = {
  width: 800,
  height: 600,
};

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height); // aspect-ratio: 800wx600h
camera.position.z = 3;
scene.add(camera);

// Renderer
const canvas = createCanvas(sizes);
const renderer = new THREE.WebGLRenderer({
  canvas,
});

renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);
