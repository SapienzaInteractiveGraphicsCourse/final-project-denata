import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Ship } from './Ship.js';
import { Truck } from './Truck.js';
import { Crane } from './Crane.js';
import { Dock } from './Dock.js';
import { ContainerManager } from './ContainerManager.js';

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
camera.position.set(0, 25, 85);
camera.lookAt(0, 4, 26);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CAMERA CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4, 26);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 12;
controls.maxDistance = 160;
controls.update();

// LIGHTS
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(10, 20, 10);
scene.add(sun);

// SEA
const sea = new THREE.Mesh(
  new THREE.BoxGeometry(1200, 0.2, 600),
  new THREE.MeshStandardMaterial({ color: 0x168aad })
);
sea.position.set(0, -0.2, -295);
scene.add(sea);

// DOCK
const dock = new Dock();
scene.add(dock.root);

// TRUCK
const truck = new Truck();
scene.add(truck.root);

// CRANE
const crane = new Crane();
crane.root.position.set(12, 2, 42);
scene.add(crane.root);

const craneControls = {
  raiseBoom: false,
  lowerBoom: false,
  rotateLeft: false,
  rotateRight: false,
  moveTowardSea: false,
  moveAwayFromSea: false,
  raiseSpreader: false,
  lowerSpreader: false
};

// SHIP PLACEHOLDER
const ship = new Ship();
scene.add(ship.root);

// CARGO AREAS
export const cargoAreas = {
  ship: ship.slots,
  dock: dock.depotSlots,
  truck: truck.slots
};

const containerManager = new ContainerManager();

containerManager
  .load()
  .then(() => {
    const shipSlotIds = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

    shipSlotIds.forEach((slotId, index) => {
      const cargo = containerManager.createRandom();
      cargo.name = `ShipContainer-${index + 1}`;
      ship.slots.place(cargo, slotId);
    });

    let depotIndex = 1;
    let depotSlotId = dock.depotSlots.findEmpty();

    while (depotSlotId) {
      const cargo = containerManager.createRandom();
      cargo.name = `DepotContainer-${depotIndex}`;
      dock.depotSlots.place(cargo, depotSlotId);
      depotIndex += 1;
      depotSlotId = dock.depotSlots.findEmpty();
    }

    const truckCargo = containerManager.createRandom();
    truckCargo.name = 'TruckContainer-1';
    truck.slots.place(truckCargo, 'T1');
  })
  .catch((error) => {
    console.error('Error loading container:', error);
  });

// SPACE = ARRIVE / DEPART
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    ship.toggle();
  }

  if (event.code === 'KeyT' && !event.repeat) {
    truck.toggle();
  }

  if (event.code === 'KeyW') {
    craneControls.raiseBoom = true;
  }

  if (event.code === 'KeyS') {
    craneControls.lowerBoom = true;
  }

  if (event.code === 'KeyA') {
    craneControls.rotateLeft = true;
  }

  if (event.code === 'KeyD') {
    craneControls.rotateRight = true;
  }

  if (event.code === 'ArrowUp') {
    craneControls.moveTowardSea = true;
    event.preventDefault();
  }

  if (event.code === 'ArrowDown') {
    craneControls.moveAwayFromSea = true;
    event.preventDefault();
  }

  if (event.code === 'KeyR') {
    craneControls.raiseSpreader = true;
  }

  if (event.code === 'KeyF') {
    craneControls.lowerSpreader = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyW') {
    craneControls.raiseBoom = false;
  }

  if (event.code === 'KeyS') {
    craneControls.lowerBoom = false;
  }

  if (event.code === 'KeyA') {
    craneControls.rotateLeft = false;
  }

  if (event.code === 'KeyD') {
    craneControls.rotateRight = false;
  }

  if (event.code === 'ArrowUp') {
    craneControls.moveTowardSea = false;
  }

  if (event.code === 'ArrowDown') {
    craneControls.moveAwayFromSea = false;
  }

  if (event.code === 'KeyR') {
    craneControls.raiseSpreader = false;
  }

  if (event.code === 'KeyF') {
    craneControls.lowerSpreader = false;
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
  const boomDirection = Number(craneControls.lowerBoom)
    - Number(craneControls.raiseBoom);
  const rotationDirection = Number(craneControls.rotateRight)
    - Number(craneControls.rotateLeft);
  const travelDirection = Number(craneControls.moveAwayFromSea)
    - Number(craneControls.moveTowardSea);
  const hoistDirection = Number(craneControls.raiseSpreader)
    - Number(craneControls.lowerSpreader);

  ship.update(time);
  truck.update(time);
  crane.update(
    time,
    boomDirection,
    rotationDirection,
    travelDirection,
    hoistDirection
  );
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
