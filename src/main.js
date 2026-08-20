import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Ship } from './Ship.js';
import { Truck } from './Truck.js';
import { Crane } from './Crane.js';
import { Dock } from './Dock.js';
import { ContainerManager } from './ContainerManager.js';
import { CargoInteraction } from './CargoInteraction.js';
import { Physics } from './Physics.js';
import { DecorativeShips } from './DecorativeShips.js';
import { Lighting } from './Lighting.js';
import { MapBounds } from './MapBounds.js';
import { CameraViews } from './CameraViews.js';

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// CAMERA CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4, 26);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 16;
controls.maxDistance = 88;

// LIGHTS
const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(60, 80, 40);
scene.add(sun);

// SEA
const waterNormals = new THREE.TextureLoader().load(
  '/assets/textures/waternormals.jpg'
);
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

const sea = new Water(new THREE.PlaneGeometry(1200, 600), {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals,
  sunDirection: sun.position.clone().normalize(),
  sunColor: 0x77aacc, //0x555555, //0x9aadb8,
  waterColor: 0x14505c, // 0x0f4c5c, // 0x1e7a64,
  distortionScale: 3.5
});
sea.rotation.x = -Math.PI / 2;
sea.position.set(0, -0.2, -295);
sea.material.uniforms.size.value = 3;
sea.material.fragmentShader = sea.material.fragmentShader.replace(
  'reflectionSample + specularLight, reflectance',
  'reflectionSample + specularLight, reflectance * 0.25'
);
scene.add(sea);

// DOCK
const dock = new Dock();
scene.add(dock.root);

const mapBounds = new MapBounds();
scene.add(mapBounds.root);

// TRUCK
const truck = new Truck();
truck.blockerElement = document.getElementById('blocker');
scene.add(truck.root);

// CRANE
const crane = new Crane();
crane.root.position.set(15, 2, 42);
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

// CAMERA VIEWS
const cameraViews = new CameraViews({ camera, controls, crane });

// SHIP
const ship = new Ship();
scene.add(ship.root);

const decorativeShips = new DecorativeShips(() => !ship.isMoving());
scene.add(decorativeShips.root);

// LIGHTING
const lighting = new Lighting({ scene, sea, hemi, sun, dock, crane, truck, bounds: mapBounds });
const dayNightToggle = document.getElementById('dayNightToggle');
const sunriseToggle = document.getElementById('sunriseToggle');
const sunriseSwitch = document.getElementById('sunriseSwitch');

dayNightToggle?.addEventListener('change', () => {
  lighting.setDayNight(dayNightToggle.checked);
  if (sunriseSwitch) {
    sunriseSwitch.hidden = dayNightToggle.checked;
  }
});

sunriseToggle?.addEventListener('change', () => {
  lighting.setSunrise(sunriseToggle.checked);
});

// PHYSICS
const physics = new Physics();
physics.addDock(dock);
physics.addShip(ship);

// CARGO AREAS
export const cargoAreas = {
  ship: ship.slots,
  dock: dock.depotSlots,
  truck: truck.slots
};

const cargoInteraction = new CargoInteraction({
  crane,
  cargoAreas,
  truck,
  scene,
  physics,
  promptElement: document.getElementById('prompt'),
  blockerElement: document.getElementById('blocker')
});

const containerManager = new ContainerManager();

truck.onDeparted = async () => {
  const departedCargo = truck.slots.remove('T1');

  if (departedCargo) {
    physics.removeContainer(departedCargo);
  }

  await containerManager.load();

  if (Math.random() < 0.2) {
    const cargo = containerManager.createRandom();
    cargo.name = 'TruckContainer';
    truck.slots.place(cargo, 'T1');
    physics.addContainer(cargo, 'slotted');
  }

  truck.arrive();
};

containerManager
  .load()
  .then(() => {
    const shipSlotIds = [...ship.slots.slots.keys()];
    const singleStackCount = Math.floor(shipSlotIds.length / 3);
    const shipStackSizes = shipSlotIds
      .map((slotId, index) => index < singleStackCount ? 1 : 2)
      .sort(() => Math.random() - 0.5);

    shipSlotIds.forEach((slotId, index) => {
      for (let level = 0; level < shipStackSizes[index]; level += 1) {
        const cargo = containerManager.createRandom();
        cargo.name = `ShipContainer-${slotId}-${level + 1}`;
        ship.slots.place(cargo, slotId);
        cargo.userData.knockable = false;
        physics.addContainer(cargo, 'slotted');
      }
    });

    let depotIndex = 1;
    const stackSizes = [0, 1, 1, 1, 2, 2, 2, 3];

    for (const slotId of dock.depotSlots.slots.keys()) {
      const stackSize = stackSizes[Math.floor(Math.random() * stackSizes.length)];

      for (let level = 0; level < stackSize; level += 1) {
        const cargo = containerManager.createRandom();
        cargo.name = `DepotContainer-${depotIndex}`;
        dock.depotSlots.place(cargo, slotId);
        physics.addContainer(cargo, 'slotted');
        depotIndex += 1;
      }
    }

    dock.fillStaticYards(containerManager);
  })
  .catch((error) => {
    console.error('Error loading container:', error);
  });

// SPACE = ARRIVE / DEPART
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && ship.canToggle()) {
    decorativeShips.waitBeforeShipAction(() => ship.toggle());
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

  if (event.code === 'KeyE' && !event.repeat) {
    cargoInteraction.tryUseE();
  }

  if (event.code === 'KeyC' && !event.repeat) {
    cargoInteraction.tryLoadTruck();
  }

  if (event.code === 'KeyQ' && !event.repeat) {
    cargoInteraction.tryDrop();
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
let lastTime = null;

function animate(time) {
  const deltaTime = Math.min((time - (lastTime ?? time)) / 1000, 0.1);
  lastTime = time;

  const boomDirection = Number(craneControls.lowerBoom)
    - Number(craneControls.raiseBoom);
  const rotationDirection = Number(craneControls.rotateRight)
    - Number(craneControls.rotateLeft);
  const travelDirection = Number(craneControls.moveAwayFromSea)
    - Number(craneControls.moveTowardSea);
  const hoistDirection = Number(craneControls.raiseSpreader)
    - Number(craneControls.lowerSpreader);

  ship.update(time);
  decorativeShips.update(time, deltaTime);
  truck.update(time, physics);
  crane.update(
    time,
    boomDirection,
    rotationDirection,
    travelDirection,
    hoistDirection,
    (speed) => physics.isCraneBlocked(crane, speed)
  );
  cargoInteraction.update();
  physics.update(deltaTime, crane, truck);
  sea.material.uniforms.time.value += deltaTime;
  cameraViews.update(deltaTime);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
