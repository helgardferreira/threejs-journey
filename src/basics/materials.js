import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import createCanvas from "../createCanvas";
import * as dat from "dat.gui";

/**
 * Debug
 */
const gui = new dat.GUI({ width: 400 });

/**
 * Base
 */
// Canvas
const canvas = createCanvas();

// Scene
const scene = new THREE.Scene();

/**
 * Helpers
 */
// Axes helper
/* const axesHelper = new THREE.AxesHelper(100);
scene.add(axesHelper); */

/**
 * Textures
 */
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);

const doorTextures = [
  "color",
  "alpha",
  "ambientOcclusion",
  "normal",
  "height",
  "metalness",
  "roughness",
]
  .map((key) => ({
    key,
    value: textureLoader.load(`/textures/door/${key}.jpg`),
  }))
  .reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

const matcapTexture = textureLoader.load("/textures/matcaps/8.png");

const gradientTexture = textureLoader.load("/textures/gradients/5.jpg");
gradientTexture.minFilter = THREE.NearestFilter;
gradientTexture.magFilter = THREE.NearestFilter;
gradientTexture.generateMipmaps = false;

// N.B. The order of the environment maps in the load array argument matter!
const environmentMapTexture = cubeTextureLoader.load([
  "/textures/environmentMaps/0/px.jpg",
  "/textures/environmentMaps/0/nx.jpg",
  "/textures/environmentMaps/0/py.jpg",
  "/textures/environmentMaps/0/ny.jpg",
  "/textures/environmentMaps/0/pz.jpg",
  "/textures/environmentMaps/0/nz.jpg",
]);

/**
 * Objects
 */
/* const material = new THREE.MeshBasicMaterial();
material.map = doorTextures.color;
material.transparent = true;
material.alphaMap = doorTextures.alpha;
// Try to avoid using double side since it's more intensive for the GPU
material.side = THREE.DoubleSide; */

/* const material = new THREE.MeshNormalMaterial();
material.flatShading = true; */

/* const material = new THREE.MeshMatcapMaterial();
material.matcap = matcapTexture; */

/* const material = new THREE.MeshDepthMaterial(); */

/* const material = new THREE.MeshLambertMaterial(); */

/* const material = new THREE.MeshPhongMaterial();
material.shininess = 100;
material.specular = new THREE.Color(0x0000ff);
material.side = THREE.DoubleSide; */

/* const material = new THREE.MeshToonMaterial();
material.gradientMap = gradientTexture; */

/* const material = new THREE.MeshStandardMaterial();
material.transparent = true;
material.side = THREE.DoubleSide;
material.metalness = 0;
material.roughness = 1;
material.map = doorTextures.color;
material.aoMap = doorTextures.ambientOcclusion;
material.aoMapIntensity = 1;
material.displacementMap = doorTextures.height;
material.displacementScale = 0.05;
material.wireframe = false;
material.metalnessMap = doorTextures.metalness;
material.roughnessMap = doorTextures.roughness;
material.normalMap = doorTextures.normal;
material.normalScale.set(0.5, 0.5);
material.alphaMap = doorTextures.alpha; */

/* gui.add(material, "metalness").min(0).max(1).step(0.0001);
gui.add(material, "roughness").min(0).max(1).step(0.0001);
gui
  .add(material, "aoMapIntensity")
  .min(0)
  .max(5)
  .step(0.001)
  .name("ambient occlusion intensity");
gui
  .add(material, "displacementScale")
  .min(0)
  .max(0.2)
  .step(0.0001)
  .name("displacement scale");
gui
  .add(material.normalScale, "x")
  .min(0)
  .max(5)
  .step(0.001)
  .name("normal scale x");
gui
  .add(material.normalScale, "y")
  .min(0)
  .max(5)
  .step(0.001)
  .name("normal scale y");
gui.add(material, "wireframe"); */

const material = new THREE.MeshStandardMaterial();

material.metalness = 0.7;
material.roughness = 0.2;
material.side = THREE.DoubleSide;
material.envMap = environmentMapTexture;

gui.add(material, "metalness").min(0).max(1).step(0.0001);
gui.add(material, "roughness").min(0).max(1).step(0.0001);

/**
 * Objects
 */
// Sphere
const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 64), material);
sphere.position.x = -1.5;
sphere.geometry.setAttribute(
  "uv2",
  new THREE.BufferAttribute(sphere.geometry.attributes.uv.array, 2)
);

// Plane
const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 100, 100), material);
// ThreeJS needs us to provide a uv2 attribute in order to apply ambient occlusion
plane.geometry.setAttribute(
  "uv2",
  // itemSize here is 2 since the ambient occlusion map is 2D
  new THREE.BufferAttribute(plane.geometry.attributes.uv.array, 2)
);

// Torus
const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.3, 0.2, 64, 128),
  material
);
torus.position.x = 1.5;
torus.geometry.setAttribute(
  "uv2",
  new THREE.BufferAttribute(torus.geometry.attributes.uv.array, 2)
);

scene.add(sphere, plane, torus);

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
camera.position.y = 1;
camera.position.z = 2;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  // alpha: true,
});
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
  const elapsedTime = clock.getElapsedTime();

  // Update objects
  /* sphere.rotation.y = 0.1 * elapsedTime;
  plane.rotation.y = 0.1 * elapsedTime;
  torus.rotation.y = 0.1 * elapsedTime;

  sphere.rotation.x = 0.15 * elapsedTime;
  plane.rotation.x = 0.15 * elapsedTime;
  torus.rotation.x = 0.15 * elapsedTime; */

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call renderAnimation again on the next frame
  window.requestAnimationFrame(renderAnimation);
};

renderAnimation();
