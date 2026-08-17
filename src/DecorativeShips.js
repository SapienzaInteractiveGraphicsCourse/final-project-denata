import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tween, Easing } from '@tweenjs/tween.js';

const WATER_LEVEL = -2;
const SPAWN_INTERVAL = 15;
const TRAVEL_TIME = 23000;
const SHIP_CLEAR_TIME = 20000;

const SHIP_TYPES = [
  {
    name: 'DecorativeShip1',
    path: '/assets/models/ships/deco/deco_ship_1.glb',
    length: 90
  },
  {
    name: 'DecorativeShip2',
    path: '/assets/models/ships/deco/deco_ship_2.glb',
    length: 100
  },
  {
    name: 'DecorativeShip3',
    path: '/assets/models/ships/deco/deco_ship_3.glb',
    length: 50
  },
  {
    name: 'DecorativeShip4',
    path: '/assets/models/ships/deco/deco_ship_4.glb',
    length: 220
  }
];

const ROUTES = [
  {
    start: new THREE.Vector3(-300, WATER_LEVEL, -55),
    end: new THREE.Vector3(300, WATER_LEVEL, -55),
    rotationY: Math.PI
  },
  {
    start: new THREE.Vector3(300, WATER_LEVEL, -105),
    end: new THREE.Vector3(-300, WATER_LEVEL, -105),
    rotationY: 0
  }
];

export class DecorativeShips {
  constructor(canSpawn) {
    this.root = new THREE.Group();
    this.root.name = 'DecorativeShips';

    this.loader = new GLTFLoader();
    this.templates = new Map();
    this.movingShips = [];
    this.canSpawn = canSpawn;
    this.spawnTimer = 0;
    this.nextRouteIndex = 0;
    this.lastSpawnTime = null;
    this.waitTimer = null;
    this.spawningPaused = false;
    this.ready = false;

    this.initialize().catch((error) => {
      console.error('Error loading decorative ships:', error);
    });
  }

  async initialize() {
    await Promise.all(SHIP_TYPES.map((shipData) => this.loadTemplate(shipData)));

    this.addDockedShip(
      SHIP_TYPES[0],
      new THREE.Vector3(-80, WATER_LEVEL, -3)
    );
    this.addDockedShip(
      SHIP_TYPES[1],
      new THREE.Vector3(105, WATER_LEVEL, -3)
    );
    this.ready = true;
  }

  async loadTemplate(shipData) {
    const gltf = await this.loader.loadAsync(shipData.path);
    const template = this.prepareModel(gltf.scene, shipData.length);
    this.templates.set(shipData.path, template);
  }

  prepareModel(model, targetLength) {
    const modelHolder = new THREE.Group();
    modelHolder.add(model);

    let box = new THREE.Box3().setFromObject(modelHolder);
    let size = box.getSize(new THREE.Vector3());

    if (size.z > size.x) {
      modelHolder.rotation.y = Math.PI / 2;
      box.setFromObject(modelHolder);
      size = box.getSize(new THREE.Vector3());
    }

    modelHolder.rotation.y += Math.PI;
    modelHolder.scale.setScalar(targetLength / size.x);

    box.setFromObject(modelHolder);
    size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    modelHolder.position.set(
      -center.x,
      -box.min.y - size.y * 0.12,
      -center.z
    );

    return modelHolder;
  }

  addDockedShip(shipData, position) {
    const template = this.templates.get(shipData.path);
    const ship = new THREE.Group();
    ship.name = `${shipData.name}Docked`;
    ship.position.copy(position);
    ship.add(template.clone(true));
    this.root.add(ship);
  }

  spawnShip() {
    const shipData = SHIP_TYPES[
      Math.floor(Math.random() * SHIP_TYPES.length)
    ];
    const route = ROUTES[this.nextRouteIndex];
    const template = this.templates.get(shipData.path);
    const ship = new THREE.Group();

    this.nextRouteIndex = (this.nextRouteIndex + 1) % ROUTES.length;

    ship.name = `${shipData.name}Moving`;
    ship.position.copy(route.start);
    ship.rotation.y = route.rotationY;
    ship.add(template.clone(true));
    this.root.add(ship);

    const movingShip = { ship, tween: null };
    movingShip.tween = new Tween(ship.position, false)
      .to({ x: route.end.x, y: route.end.y, z: route.end.z }, TRAVEL_TIME)
      .easing(Easing.Linear.None)
      .onComplete(() => {
        this.removeMovingShip(movingShip);
      })
      .start();

    this.movingShips.push(movingShip);
    this.lastSpawnTime = Date.now();
  }

  waitBeforeShipAction(action) {
    if (this.waitTimer !== null) {
      return;
    }

    this.spawningPaused = true;
    this.spawnTimer = 0;

    const timeSinceLastSpawn = this.lastSpawnTime === null
      ? SHIP_CLEAR_TIME
      : Date.now() - this.lastSpawnTime;
    const waitTime = Math.max(0, SHIP_CLEAR_TIME - timeSinceLastSpawn);

    this.waitTimer = setTimeout(() => {
      this.waitTimer = null;
      action();
      this.spawningPaused = false;
    }, waitTime);
  }

  removeMovingShip(movingShip) {
    this.root.remove(movingShip.ship);
    movingShip.ship.clear();

    const index = this.movingShips.indexOf(movingShip);

    if (index !== -1) {
      this.movingShips.splice(index, 1);
    }

    movingShip.ship = null;
    movingShip.tween = null;
  }

  update(time, deltaTime) {
    [...this.movingShips].forEach((movingShip) => {
      movingShip.tween?.update(time);
    });

    if (!this.ready || this.spawningPaused || !this.canSpawn()) {
      this.spawnTimer = 0;
      return;
    }

    this.spawnTimer += deltaTime;

    if (this.spawnTimer < SPAWN_INTERVAL) {
      return;
    }

    this.spawnTimer = 0;
    this.spawnShip();
  }
}
