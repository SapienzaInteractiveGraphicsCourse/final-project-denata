import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Ship } from './Ship.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(70, 60, 65);
camera.lookAt(0, 0, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CAMERA CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 250;
controls.update();

// LIGHTS
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(10, 20, 10);
scene.add(sun);

// SEA
const sea = new THREE.Mesh(
  new THREE.BoxGeometry(160, 0.2, 100),
  new THREE.MeshStandardMaterial({ color: 0x168aad })
);
sea.position.set(0, -0.2, -44);
scene.add(sea);

// DOCK
const dock = new THREE.Mesh(
  new THREE.BoxGeometry(80, 5, 24),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
dock.position.set(0, -0.5, 18);
scene.add(dock);

// SHIP PLACEHOLDER
const ship = new Ship();
scene.add(ship.root);

// CONTAINER IMPORTED FROM GLB
const loader = new GLTFLoader();

loader.load(
  '/assets/models/20ft_container.glb',

  (gltf) => {
    const containers = gltf.scene;

    // Initial position on the dock
    containers.position.set(0, 2, 10);

    scene.add(containers);

    // Model dimensions
    const box = new THREE.Box3().setFromObject(containers);
    const size = new THREE.Vector3();
    box.getSize(size);

    console.log('Container loaded:', containers);
    console.log(
      `Model dimensions: x=${size.x.toFixed(2)}, y=${size.y.toFixed(2)}, z=${size.z.toFixed(2)}`
    );

    const cargoPositions = [
      [-8, 4.5, -2.5],
      [0, 4.5, -2.5],
      [8, 4.5, -2.5],
      [-8, 4.5, 2.5],
      [0, 4.5, 2.5],
      [8, 4.5, 2.5]
    ];

    cargoPositions.forEach(([x, y, z], index) => {
      const cargo = containers.clone(true);
      cargo.name = `ShipContainer-${index + 1}`;
      cargo.rotation.y = Math.PI / 2;
      ship.addCargo(cargo, new THREE.Vector3(x, y, z));
    });
  },

  undefined,

  (error) => {
    console.error('Error loading container:', error);
  }
);

// SPACE = ARRIVE / DEPART
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    ship.toggle();
  }
});

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// LOOP
function animate(time) {
  ship.update(time);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
