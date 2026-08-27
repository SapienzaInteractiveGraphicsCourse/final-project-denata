import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import { enableShadows } from './Lighting.js';

const HEADLIGHT_LENS = new THREE.MeshBasicMaterial({
  color: 0xfff4cc,
  side: THREE.DoubleSide
});
const TAILLIGHT_LENS = new THREE.MeshBasicMaterial({
  color: 0xff3333,
  side: THREE.DoubleSide
});
const ROAD_HEIGHT = 2.06;
const TURN = 8 * 0.5522847498;

const MODELS = [
  {
    name: 'TrafficTruck',
    path: `${import.meta.env.BASE_URL}assets/models/trucks.glb`,
    length: 8,
    wheelNames: ['FR', 'FL', 'RL', 'RR']
  },
  {
    name: 'TrafficKei',
    path: `${import.meta.env.BASE_URL}assets/models/simple_truck.glb`,
    length: 5.2,
    wheelNames: []
  }
];

function makeLine(x1, z1, x2, z2) {
  const path = new THREE.CurvePath();
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(x1, ROAD_HEIGHT, z1),
      new THREE.Vector3(x2, ROAD_HEIGHT, z2)
    )
  );
  return path;
}

function makeEastHook() {
  const path = new THREE.CurvePath();
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(40, ROAD_HEIGHT, 76),
      new THREE.Vector3(80, ROAD_HEIGHT, 76)
    )
  );
  path.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(80, ROAD_HEIGHT, 76),
      new THREE.Vector3(80 + TURN, ROAD_HEIGHT, 76),
      new THREE.Vector3(88, ROAD_HEIGHT, 68 + TURN),
      new THREE.Vector3(88, ROAD_HEIGHT, 68)
    )
  );
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(88, ROAD_HEIGHT, 68),
      new THREE.Vector3(88, ROAD_HEIGHT, 28)
    )
  );
  return path;
}

function makeWestCurve() {
  const path = new THREE.CurvePath();
  path.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(-102, ROAD_HEIGHT, 20),
      new THREE.Vector3(-102 - TURN, ROAD_HEIGHT, 20),
      new THREE.Vector3(-110, ROAD_HEIGHT, 28 - TURN),
      new THREE.Vector3(-110, ROAD_HEIGHT, 28)
    )
  );
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(-110, ROAD_HEIGHT, 28),
      new THREE.Vector3(-110, ROAD_HEIGHT, 40)
    )
  );
  path.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(-110, ROAD_HEIGHT, 40),
      new THREE.Vector3(-110, ROAD_HEIGHT, 40 + TURN),
      new THREE.Vector3(-102 - TURN, ROAD_HEIGHT, 48),
      new THREE.Vector3(-102, ROAD_HEIGHT, 48)
    )
  );
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(-102, ROAD_HEIGHT, 48),
      new THREE.Vector3(-80, ROAD_HEIGHT, 48)
    )
  );
  return path;
}

// Extra port roads only. The player truck loop (z=20 west, x=0, z=64, x=-32) stays empty.
const ROUTES = [
  { model: 0, speed: 8, start: 0.1, reverse: false, path: makeLine(40, 32, 40, 108) },
  { model: 1, speed: 7, start: 0.55, reverse: true, path: makeLine(64, 28, 64, 74) },
  { model: 1, speed: 6.5, start: 0.2, reverse: false, path: makeEastHook() },
  { model: 1, speed: 7.5, start: 0.4, reverse: true, path: makeLine(-68, 88, -40, 88) },
  { model: 0, speed: 7, start: 0.35, reverse: false, path: makeLine(-80, 48, -80, 88) },
  { model: 0, speed: 7, start: 0.35, reverse: false, path: makeLine(40, 64, 88, 64) },
  { model: 1, speed: 6.5, start: 0.15, reverse: false, path: makeWestCurve() },
  { model: 0, speed: 7, start: 0.2, reverse: false, path: makeLine(-56, 28, -56, 84) },
  { model: 1, speed: 6.5, start: 0.25, reverse: false, path: makeLine(-28, 108, 36, 108) }
];

export class Traffic {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Traffic';
    this.templates = [];
    this.vehicles = [];
    this.nightLightsOn = false;
    this.ready = false;
    this.loading = this.initialize();
  }

  async initialize() {
    const loader = new GLTFLoader();

    for (const modelData of MODELS) {
      const gltf = await loader.loadAsync(modelData.path);
      this.templates.push(this.prepareModel(gltf.scene, modelData));
    }

    ROUTES.forEach((route, index) => {
      this.addVehicle(route, index);
    });

    this.ready = true;
  }

  prepareModel(source, modelData) {
    const model = source.clone(true);
    const holder = new THREE.Group();
    holder.name = modelData.name;
    holder.add(model);

    let box = new THREE.Box3().setFromObject(holder);
    let size = box.getSize(new THREE.Vector3());

    if (size.z > size.x) {
      holder.rotation.y = Math.PI / 2;
      box.setFromObject(holder);
      size = box.getSize(new THREE.Vector3());
    }

    holder.scale.setScalar(modelData.length / size.x);
    box.setFromObject(holder);

    const center = box.getCenter(new THREE.Vector3());
    holder.position.set(-center.x, -box.min.y, -center.z);

    enableShadows(holder);
    return holder;
  }

  addVehicle(route, index) {
    const modelData = MODELS[route.model];
    const template = this.templates[route.model];
    const root = new THREE.Group();
    const model = template.clone(true);

    root.name = `${modelData.name}-${index + 1}`;
    root.add(model);
    this.root.add(root);

    const wheels = modelData.wheelNames
      .map((name) => root.getObjectByName(name))
      .filter(Boolean);

    let wheelRadius = 0;

    if (wheels.length > 0) {
      const wheelBox = new THREE.Box3().setFromObject(wheels[0]);
      wheelRadius = wheelBox.getSize(new THREE.Vector3()).y / 2;
    }

    const vehicle = {
      root,
      path: route.path,
      speed: route.speed,
      reverse: route.reverse,
      motion: { progress: route.start },
      lastPosition: new THREE.Vector3(),
      wheels,
      wheelRadius,
      nightLights: [],
      tween: null
    };

    this.setupLights(vehicle);
    this.placeVehicle(vehicle);
    vehicle.lastPosition.copy(vehicle.root.position);
    this.vehicles.push(vehicle);
  }

  setupLights(vehicle) {
    const box = new THREE.Box3().setFromObject(vehicle.root);
    const size = box.getSize(new THREE.Vector3());
    const z = size.z * 0.36;
    const headY = size.y * 0.24;
    const tailY = size.y * 0.3;

    const addLens = (x, y, side, width, height, material) => {
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      lens.position.set(x, y, side);
      lens.rotation.y = Math.PI / 2;
      vehicle.root.add(lens);
      vehicle.nightLights.push(lens);
    };

    addLens(box.max.x + 0.02, headY, z, 0.22, 0.07, HEADLIGHT_LENS);
    addLens(box.max.x + 0.02, headY, -z, 0.22, 0.07, HEADLIGHT_LENS);
    addLens(box.min.x - 0.02, tailY, z, 0.16, 0.06, TAILLIGHT_LENS);
    addLens(box.min.x - 0.02, tailY, -z, 0.16, 0.06, TAILLIGHT_LENS);

    this.applyLights(vehicle, this.nightLightsOn);
  }

  applyLights(vehicle, on) {
    vehicle.nightLights.forEach((lens) => {
      lens.visible = on;
    });
  }

  setLightsOn(on) {
    this.nightLightsOn = on;
    this.vehicles.forEach((vehicle) => {
      this.applyLights(vehicle, on);
    });
  }

  placeVehicle(vehicle) {
    const progress = THREE.MathUtils.clamp(vehicle.motion.progress, 0, 1);
    const point = vehicle.path.getPointAt(progress);
    const tangent = vehicle.path.getTangentAt(progress);

    if (vehicle.reverse) {
      tangent.multiplyScalar(-1);
    }

    vehicle.root.position.copy(point);
    vehicle.root.rotation.y = Math.atan2(-tangent.z, tangent.x);

    if (vehicle.wheelRadius > 0) {
      const distance = point.distanceTo(vehicle.lastPosition);

      if (distance > 0 && distance < 4) {
        const rotation = distance / vehicle.wheelRadius;

        vehicle.wheels.forEach((wheel) => {
          wheel.rotation.x += rotation;
        });
      }
    }

    vehicle.lastPosition.copy(point);
  }

  startDrive(vehicle, time) {
    const from = vehicle.motion.progress;
    const to = vehicle.reverse ? 0 : 1;
    const length = vehicle.path.getLength() * Math.abs(to - from);
    const duration = Math.max(1200, (length / vehicle.speed) * 1000);

    vehicle.tween = new Tween(vehicle.motion, false)
      .to({ progress: to }, duration)
      .easing(Easing.Linear.None)
      .onUpdate(() => {
        this.placeVehicle(vehicle);
      })
      .onComplete(() => {
        vehicle.reverse = !vehicle.reverse;
        this.startDrive(vehicle);
      });

    if (time === undefined) {
      vehicle.tween.start();
    } else {
      vehicle.tween.start(time);
    }
  }

  update(time) {
    if (!this.ready) {
      return;
    }

    this.vehicles.forEach((vehicle) => {
      if (!vehicle.tween) {
        this.startDrive(vehicle, time);
      }

      vehicle.tween?.update(time);
    });
  }
}
