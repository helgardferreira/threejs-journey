import * as THREE from "three";
import createCanvas from "../createCanvas";

export default function basics() {
  // Sizes
  const sizes = {
    width: 800,
    height: 600,
  };

  const scene = new THREE.Scene();

  // Red cube
  const redCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );

  // Green cube
  const greenCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );

  // Blue cube
  const blueCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x0000ff })
  );

  const cubes = new THREE.Group();
  cubes.add(redCube);
  redCube.position.x = -2;
  cubes.add(greenCube);
  greenCube.position.x = 0;
  cubes.add(blueCube);
  blueCube.position.x = 2;

  // Positioning the cubes
  // cubes.position.x = 0.7;
  // cubes.position.y = -0.6;
  // cubes.position.z = 1;
  cubes.position.set(1, -0.6, 1);
  scene.add(cubes);

  // Scaling the cubes
  cubes.scale.set(2, 0.5, 0.5);

  // Rotating the cubes
  cubes.rotation.reorder("YXZ"); // Object3D.rotation.reorder can help with rotation orientation logic
  cubes.rotation.set(Math.PI / 4, Math.PI / 4, 0);

  // Axes helper
  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);

  // Camera
  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height); // aspect-ratio: 800wx600h
  camera.position.x = 3;
  camera.position.y = 2;
  camera.position.z = 7;
  scene.add(camera);

  // Make camera "lookAt" the cubes
  camera.lookAt(cubes.position);

  // Renderer
  const canvas = createCanvas(sizes);
  const renderer = new THREE.WebGLRenderer({
    canvas,
  });

  renderer.setSize(sizes.width, sizes.height);
  renderer.render(scene, camera);
}
