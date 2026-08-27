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
import { Traffic } from './Traffic.js';
import { Lighting } from './Lighting.js';
import { MapBounds } from './MapBounds.js';
import { CameraViews } from './CameraViews.js';
import { Worker } from './Worker.js';

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

const loadingScreen = document.getElementById('loadingScreen');
const loadingStatus = document.getElementById('loadingStatus');
const loadingProgress = document.getElementById('loadingProgress');
const loadingPercent = document.getElementById('loadingPercent');
let gameReady = false;

// CAMERA CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4, 26);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 16;
controls.maxDistance = 88;
controls.enabled = false;

// LIGHTS
const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(60, 80, 40);
scene.add(sun);

// SEA
const waterNormalsLoader = new THREE.TextureLoader();
let waterNormals;
const waterNormalsLoading = new Promise((resolve, reject) => {
  waterNormals = waterNormalsLoader.load(
    `${import.meta.env.BASE_URL}assets/textures/waternormals.jpg`,
    resolve,
    undefined,
    reject
  );
});
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
crane.root.position.set(14, 2, 42);
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

// WORKER
const worker = new Worker();
worker.root.position.set(-22, 2, 12);
worker.root.rotation.y = Math.PI;
scene.add(worker.root);

const workerControls = {
  forward: false,
  back: false,
  left: false,
  right: false
};

// CAMERA VIEWS
const cameraViews = new CameraViews({ camera, controls, crane, worker });
cameraViews.setEnabled(false);

// SHIP
const ship = new Ship();
scene.add(ship.root);

const decorativeShips = new DecorativeShips(() => !ship.isMoving());
scene.add(decorativeShips.root);

// TRAFFIC
const traffic = new Traffic();
scene.add(traffic.root);

// LIGHTING
const lighting = new Lighting({ scene, sea, hemi, sun, dock, crane, truck, traffic, bounds: mapBounds, worker });
const dayNightToggle = document.getElementById('dayNightToggle');
const sunriseToggle = document.getElementById('sunriseToggle');
const sunriseSwitch = document.getElementById('sunriseSwitch');

if (dayNightToggle) {
  dayNightToggle.disabled = true;
}

if (sunriseToggle) {
  sunriseToggle.disabled = true;
}

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

async function populateInitialCargo() {
  await Promise.all([containerManager.load(), ship.loading]);

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
}

const initialCargoLoading = populateInitialCargo();

const flashlightPrompt = document.getElementById('flashlightPrompt');

function isWorkerView() {
  return cameraViews.isWorkerView();
}

function updateFlashlightPrompt(workerView) {
  const canUseFlashlight = workerView && lighting.isNight;

  if (!canUseFlashlight) {
    if (flashlightPrompt) {
      flashlightPrompt.hidden = true;
    }

    worker.putAwayFlashlight();
    return;
  }

  if (!flashlightPrompt) {
    return;
  }

  flashlightPrompt.textContent = worker.flashlightOn
    ? 'Press L to put away the flashlight'
    : 'Press L to turn on the flashlight';
  flashlightPrompt.hidden = false;
}

function clearCraneControls() {
  craneControls.raiseBoom = false;
  craneControls.lowerBoom = false;
  craneControls.rotateLeft = false;
  craneControls.rotateRight = false;
  craneControls.moveTowardSea = false;
  craneControls.moveAwayFromSea = false;
  craneControls.raiseSpreader = false;
  craneControls.lowerSpreader = false;
}

function clearWorkerControls() {
  workerControls.forward = false;
  workerControls.back = false;
  workerControls.left = false;
  workerControls.right = false;
}

// SPACE = ARRIVE / DEPART
window.addEventListener('keydown', (event) => {
  if (!gameReady) {
    return;
  }

  if (isWorkerView()) {
    if (event.code === 'KeyL' && !event.repeat && lighting.isNight) {
      worker.toggleFlashlight();
    }

    if (event.code === 'ArrowUp') {
      workerControls.forward = true;
      event.preventDefault();
    }

    if (event.code === 'ArrowDown') {
      workerControls.back = true;
      event.preventDefault();
    }

    if (event.code === 'ArrowLeft') {
      workerControls.left = true;
      event.preventDefault();
    }

    if (event.code === 'ArrowRight') {
      workerControls.right = true;
      event.preventDefault();
    }

    return;
  }

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
  if (event.code === 'ArrowUp') {
    workerControls.forward = false;
    craneControls.moveTowardSea = false;
  }

  if (event.code === 'ArrowDown') {
    workerControls.back = false;
    craneControls.moveAwayFromSea = false;
  }

  if (event.code === 'ArrowLeft') {
    workerControls.left = false;
  }

  if (event.code === 'ArrowRight') {
    workerControls.right = false;
  }

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

function setLoadingStatus(message, progress) {
  if (loadingStatus) {
    loadingStatus.textContent = message;
  }
  if (progress !== undefined && loadingProgress) {
    loadingProgress.style.setProperty('--progress', `${progress}%`);
    loadingProgress.setAttribute('aria-valuenow', progress);
    loadingPercent.textContent = `${progress}%`;
  }
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function createPrecompileRoot() {
  const root = new THREE.Group();
  root.name = 'PrecompileTemplates';

  containerManager.templates.forEach((template) => {
    root.add(template.model.clone(true));
  });

  for (const templateLoading of ship.templates.values()) {
    const template = await templateLoading;
    root.add(template.clone(true));
  }

  decorativeShips.templates.forEach((template) => {
    root.add(template.clone(true));
  });

  traffic.templates.forEach((template) => {
    root.add(template.clone(true));
  });

  return root;
}

async function precompileLook(isNight, precompileRoot) {
  lighting.setDayNight(isNight);
  setLoadingStatus(isNight
    ? 'Lighting the docks...'
    : 'Preparing the harbor...', isNight ? 90 : 82);
  await waitForPaint();

  await renderer.compileAsync(scene, camera);
  await renderer.compileAsync(precompileRoot, camera, scene);

  // Warm up shadows and Water's additional reflection render while the
  // loading screen still covers the canvas.
  renderer.render(scene, camera);
}

async function precompileWorkerFlashlight(precompileRoot) {
  setLoadingStatus('Calibrating cranes and lights...', 95);
  worker.showFlashlight();

  try {
    await waitForPaint();
    await renderer.compileAsync(scene, camera);
    await renderer.compileAsync(precompileRoot, camera, scene);
    renderer.render(scene, camera);
  } finally {
    worker.putAwayFlashlight();
  }
}

async function initializeGame() {
  let progress = 0;
  const loadingTimer = setInterval(() => setLoadingStatus('Loading port assets...', progress = Math.min(70, progress + 1)), 700);
  try {
    setLoadingStatus('Loading port assets...', progress);

    await Promise.all([
      waterNormalsLoading,
      dock.loading,
      truck.loading,
      crane.loading,
      ship.loading,
      decorativeShips.loading,
      traffic.loading,
      worker.loading,
      initialCargoLoading
    ]);

    clearInterval(loadingTimer);
    setLoadingStatus('Building the cargo terminal...', 75);
    const precompileRoot = await createPrecompileRoot();
    await precompileLook(false, precompileRoot);
    await precompileLook(true, precompileRoot);
    await precompileWorkerFlashlight(precompileRoot);

    setLoadingStatus('Final checks...', 98);
    truck.root.visible = false;
    await waitForPaint();
    await renderer.compileAsync(scene, camera);
    await renderer.compileAsync(precompileRoot, camera, scene);
    renderer.render(scene, camera);
    truck.root.visible = true;

    lighting.setDayNight(false);
    renderer.render(scene, camera);
    precompileRoot.clear();

    if (dayNightToggle) {
      dayNightToggle.checked = false;
      dayNightToggle.disabled = false;
    }

    if (sunriseToggle) {
      sunriseToggle.checked = false;
      sunriseToggle.disabled = false;
    }

    if (sunriseSwitch) {
      sunriseSwitch.hidden = false;
    }

    gameReady = true;
    cameraViews.setEnabled(true);
    setLoadingStatus('Ready for your shift.', 100);
    lastTime = null;
    requestAnimationFrame(animate);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (loadingScreen) {
      loadingScreen.classList.add('is-hidden');
      setTimeout(() => {
        loadingScreen.hidden = true;
      }, 300);
    }
  } catch (error) {
    clearInterval(loadingTimer);
    console.error('Unable to initialize the game:', error);

    if (loadingScreen) {
      loadingScreen.classList.add('is-error');
    }

    setLoadingStatus('The harbor could not be loaded. Check the console for details.');
  }
}

// LOOP
let lastTime = null;

function animate(time) {
  const deltaTime = Math.min((time - (lastTime ?? time)) / 1000, 0.1);
  lastTime = time;

  const workerView = isWorkerView();

  if (workerView) {
    clearCraneControls();
  } else {
    clearWorkerControls();
  }

  const boomDirection = workerView
    ? 0
    : Number(craneControls.lowerBoom) - Number(craneControls.raiseBoom);
  const rotationDirection = workerView
    ? 0
    : Number(craneControls.rotateRight) - Number(craneControls.rotateLeft);
  const travelDirection = workerView
    ? 0
    : Number(craneControls.moveAwayFromSea) - Number(craneControls.moveTowardSea);
  const hoistDirection = workerView
    ? 0
    : Number(craneControls.raiseSpreader) - Number(craneControls.lowerSpreader);

  const walkForward = Number(workerControls.forward) - Number(workerControls.back);
  const walkTurn = Number(workerControls.left) - Number(workerControls.right);
  const walking = workerView && worker.move(deltaTime, walkForward, walkTurn);

  ship.update(time);
  decorativeShips.update(time, deltaTime);
  traffic.update(time);
  truck.update(time, physics);
  crane.update(
    time,
    boomDirection,
    rotationDirection,
    travelDirection,
    hoistDirection,
    (speed) => physics.isCraneBlocked(crane, speed)
  );
  worker.update(deltaTime, walking, cameraViews.isWorkerFirstPerson());

  if (workerView) {
    cargoInteraction.hidePrompt();
  } else {
    cargoInteraction.update();
  }

  updateFlashlightPrompt(workerView);
  physics.update(deltaTime, crane, truck);
  sea.material.uniforms.time.value += deltaTime;
  cameraViews.update(deltaTime);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

initializeGame();

window.__harbor = { camera, scene, controls, cameraViews, renderer, dock };
window.__harborPose = function (x, y, z, tx, ty, tz, opts = {}) {
  const fog = opts.fog !== false;
  const bounds = scene.getObjectByName('MapBounds');
  if (bounds) {
    bounds.visible = fog;
  }
  cameraViews.update = function () {};
  controls.enabled = false;
  camera.up.set(opts.upX ?? 0, opts.upY ?? 1, opts.upZ ?? 0);
  camera.fov = opts.fov ?? 70;
  camera.near = 0.1;
  camera.far = 2500;
  camera.position.set(x, y, z);
  camera.lookAt(tx, ty, tz);
  camera.updateProjectionMatrix();
  controls.target.set(tx, ty, tz);
  renderer.render(scene, camera);
  return true;
};
