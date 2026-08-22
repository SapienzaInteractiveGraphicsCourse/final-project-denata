import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import { CargoSlots } from './CargoSlots.js';
import { enableShadows } from './Lighting.js';

const WATER_LEVEL = -2;

const SHIP_1_ROUTE = {
  arrivalStart: new THREE.Vector3(-150, WATER_LEVEL, -28),
  approach: new THREE.Vector3(10, WATER_LEVEL, -28),
  docked: new THREE.Vector3(10, WATER_LEVEL, -3),
  departureEnd: new THREE.Vector3(130, WATER_LEVEL, -155),
  arrivalAngle: 0,
  dockedAngle: 0,
  departureAngle: Math.PI / 4
};

const SHIP_2_ROUTE = {
  arrivalStart: new THREE.Vector3(135, WATER_LEVEL, -145),
  approach: new THREE.Vector3(10, WATER_LEVEL, -28),
  docked: new THREE.Vector3(10, WATER_LEVEL, -3),
  departureEnd: new THREE.Vector3(-150, WATER_LEVEL, -150),
  arrivalAngle: Math.PI / 4,
  dockedAngle: 0,
  departureAngle: -Math.PI / 4
};

const SHIP_TYPES = [
  {
    name: 'Ship1',
    path: '/assets/models/ships/ship_1.glb',
    chance: 50,
    length: 57,
    route: SHIP_1_ROUTE,
    createSlotLayout: createShip1SlotLayout
  },
  {
    name: 'Ship2',
    path: '/assets/models/ships/ship_3.glb',
    chance: 50,
    length: 75,
    route: SHIP_2_ROUTE,
    createSlotLayout: createShip2SlotLayout
  }
];

function createShip1SlotLayout() {
  const layout = [];
  const columns = [-9.6, -3.2, 3.2, 9.6];
  const rows = [-3.2, 0, 3.2];
  let index = 1;

  rows.forEach((z) => {
    columns.forEach((x) => {
      layout.push({
        id: `S${index}`,
        position: new THREE.Vector3(x, 4.5, z),
        rotationY: Math.PI / 2
      });
      index += 1;
    });
  });

  return layout;
}

function createShip2SlotLayout() {
  const layout = [];
  const columns = [
    -25.05,
    -18.75,
    -12.45,
    -6.15,
    0.15,
    6.45,
    12.75,
    19.05
  ];
  const rows = [-2, 0.8, 3.6];
  let index = 1;

  rows.forEach((z) => {
    columns.forEach((x) => {
      layout.push({
        id: `S${index}`,
        position: new THREE.Vector3(x, 5.1, z),
        rotationY: Math.PI / 2
      });
      index += 1;
    });
  });

  return layout;
}

export class Ship {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Ship';
    this.root.visible = false;

    this.loader = new GLTFLoader();
    this.templates = new Map();
    this.model = null;
    this.shipData = this.chooseRandomShip();
    this.state = 'loading';
    this.tween = null;

    this.hull = new THREE.Mesh(
      new THREE.BoxGeometry(75, 6, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.hull.name = 'ShipCollision';
    this.hull.position.y = 1.5;
    this.root.add(this.hull);

    this.cargoRoot = new THREE.Group();
    this.cargoRoot.name = 'ShipCargo';
    this.root.add(this.cargoRoot);

    this.slots = new CargoSlots(
      this.cargoRoot,
      this.shipData.createSlotLayout(),
      2
    );

    this.loading = this.initialize();
  }

  async initialize() {
    await Promise.all(SHIP_TYPES.map((shipData) => this.loadTemplate(shipData)));
    await this.showShip(this.shipData);

    this.root.position.copy(this.shipData.route.docked);
    this.root.rotation.y = this.shipData.route.dockedAngle;
    this.root.visible = true;
    this.state = 'docked';
  }

  async loadTemplate(shipData) {
    if (!this.templates.has(shipData.path)) {
      this.templates.set(
        shipData.path,
        this.loader.loadAsync(shipData.path).then((gltf) => (
          this.prepareModel(gltf.scene, shipData.length)
        ))
      );
    }

    return this.templates.get(shipData.path);
  }

  chooseRandomShip() {
    const totalChance = SHIP_TYPES.reduce(
      (total, shipData) => total + shipData.chance,
      0
    );
    let random = Math.random() * totalChance;

    return SHIP_TYPES.find((shipData) => {
      random -= shipData.chance;
      return random <= 0;
    }) ?? SHIP_TYPES[0];
  }

  async showRandomShip() {
    const shipData = this.chooseRandomShip();
    this.slots.setLayout(shipData.createSlotLayout(), 2);
    await this.showShip(shipData);
  }

  async showShip(shipData) {
    const template = await this.loadTemplate(shipData);

    if (this.model) {
      this.root.remove(this.model);
    }

    this.shipData = shipData;
    this.model = template.clone(true);
    this.model.name = shipData.name;
    this.root.add(this.model);
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

    enableShadows(modelHolder);
    return modelHolder;
  }

  moveTo(position, duration, onComplete) {
    this.tween = new Tween(this.root.position, false)
      .to({ x: position.x, y: position.y, z: position.z }, duration)
      .easing(Easing.Quadratic.InOut)
      .onComplete(onComplete)
      .start();
  }

  rotateTo(angle, duration, onComplete) {
    this.tween = new Tween(this.root.rotation, false)
      .to({ y: angle }, duration)
      .easing(Easing.Quadratic.InOut)
      .onComplete(onComplete)
      .start();
  }

  pause(onComplete) {
    this.tween = null;
    setTimeout(onComplete, 500);
  }

  depart() {
    if (this.state !== 'docked') return;

    const route = this.shipData.route;
    this.state = 'departing';

    this.moveTo(route.approach, 8000, () => {
      this.pause(() => {
        this.rotateTo(route.departureAngle, 7000, () => {
          this.pause(() => {
            this.moveTo(route.departureEnd, 14000, () => {
              this.root.visible = false;
              this.state = 'absent';
              this.tween = null;
            });
          });
        });
      });
    });
  }

  async arrive() {
    if (this.state !== 'absent') return;

    this.state = 'loading';
    await this.showRandomShip();

    const route = this.shipData.route;
    this.root.position.copy(route.arrivalStart);
    this.root.rotation.y = route.arrivalAngle;
    this.root.visible = true;
    this.state = 'arriving';

    this.moveTo(route.approach, 8000, () => {
      this.pause(() => {
        const finishArrival = () => {
          this.moveTo(route.docked, 6000, () => {
            this.state = 'docked';
            this.tween = null;
          });
        };

        if (route.arrivalAngle === route.dockedAngle) {
          finishArrival();
          return;
        }

        this.rotateTo(route.dockedAngle, 7000, () => {
          this.pause(finishArrival);
        });
      });
    });
  }

  toggle() {
    if (this.state === 'docked') {
      this.depart();
    } else if (this.state === 'absent') {
      this.arrive();
    }
  }

  canToggle() {
    return this.state === 'docked' || this.state === 'absent';
  }

  isMoving() {
    return this.state === 'arriving' || this.state === 'departing';
  }

  update(time) {
    this.tween?.update(time);
  }
}
