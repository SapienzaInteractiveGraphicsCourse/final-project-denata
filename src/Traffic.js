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
const HEADLIGHT_GEOMETRY = new THREE.PlaneGeometry(0.22, 0.07);
const TAILLIGHT_GEOMETRY = new THREE.PlaneGeometry(0.16, 0.06);

// Traffic tuning. The complete inbound-loop-outbound route takes roughly
// 32 seconds; the seven-second spawn interval is intentionally kept separate.
const ROAD_HEIGHT = 2.06;
const TRAFFIC_SPEED = 14;
const SPAWN_INTERVAL_MS = 8000;
const LANE_OFFSET = 1.25;
const MAIN_ROAD_END_Z = 200;
const CURVE_HANDLE = 8 * 0.5522847498;
const JUNCTION_RADIUS = 3;
const JUNCTION_HANDLE = JUNCTION_RADIUS * 0.5522847498;

// Only these two moving traffic models are used. The parked oil truck is not
// part of this list, so it can never be selected by the random spawner.
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

function roadPoint(x, z) {
  return new THREE.Vector3(x, ROAD_HEIGHT, z);
}

// Trucks enter from the main road in the fog, use the eastern block to turn
// around, then retrace the approach road in the opposite lane and disappear.
function makeTrafficRoute() {
  const path = new THREE.CurvePath();

  // Main-road approach and the right turn onto the shared connector.
  path.add(
    new THREE.LineCurve3(
      roadPoint(40, MAIN_ROAD_END_Z),
      roadPoint(40, 79)
    )
  );
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(40, 79),
      roadPoint(40, 79 - JUNCTION_HANDLE),
      roadPoint(43 - JUNCTION_HANDLE, 76),
      roadPoint(43, 76)
    )
  );
  path.add(new THREE.LineCurve3(roadPoint(43, 76), roadPoint(61, 76)));

  // Turn north and make one clockwise lap around the eastern block.
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(61, 76),
      roadPoint(61 + JUNCTION_HANDLE, 76),
      roadPoint(64, 73 + JUNCTION_HANDLE),
      roadPoint(64, 73)
    )
  );
  path.add(new THREE.LineCurve3(roadPoint(64, 73), roadPoint(64, 23)));
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(64, 23),
      roadPoint(64, 23 - JUNCTION_HANDLE),
      roadPoint(67 - JUNCTION_HANDLE, 20),
      roadPoint(67, 20)
    )
  );
  path.add(new THREE.LineCurve3(roadPoint(67, 20), roadPoint(80, 20)));
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(80, 20),
      roadPoint(80 + CURVE_HANDLE, 20),
      roadPoint(88, 28 - CURVE_HANDLE),
      roadPoint(88, 28)
    )
  );
  path.add(new THREE.LineCurve3(roadPoint(88, 28), roadPoint(88, 68)));
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(88, 68),
      roadPoint(88, 68 + CURVE_HANDLE),
      roadPoint(80 + CURVE_HANDLE, 76),
      roadPoint(80, 76)
    )
  );

  // Return over the connector and main road, now in the opposite lane.
  path.add(new THREE.LineCurve3(roadPoint(80, 76), roadPoint(43, 76)));
  path.add(
    new THREE.CubicBezierCurve3(
      roadPoint(43, 76),
      roadPoint(43 - JUNCTION_HANDLE, 76),
      roadPoint(40, 79 - JUNCTION_HANDLE),
      roadPoint(40, 79)
    )
  );
  path.add(
    new THREE.LineCurve3(
      roadPoint(40, 79),
      roadPoint(40, MAIN_ROAD_END_Z)
    )
  );

  return path;
}

export class Traffic {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Traffic';
    this.templates = [];
    this.vehicles = [];
    this.path = makeTrafficRoute();
    this.nextSpawnAt = null;
    this.nextVehicleId = 1;
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

  addVehicle(time) {
    const modelIndex = Math.floor(Math.random() * MODELS.length);
    const modelData = MODELS[modelIndex];
    const root = new THREE.Group();
    const model = this.templates[modelIndex].clone(true);
    const id = this.nextVehicleId;

    this.nextVehicleId += 1;
    root.name = `${modelData.name}-${id}`;
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
      path: this.path,
      speed: TRAFFIC_SPEED,
      motion: { progress: 0 },
      lastPosition: new THREE.Vector3(),
      pathPoint: new THREE.Vector3(),
      pathTangent: new THREE.Vector3(),
      wheels,
      wheelRadius,
      nightLights: [],
      tween: null
    };

    this.setupLights(vehicle);
    this.placeVehicle(vehicle, false);
    vehicle.lastPosition.copy(vehicle.root.position);
    this.vehicles.push(vehicle);
    this.startDrive(vehicle, time);
  }

  setupLights(vehicle) {
    const box = new THREE.Box3().setFromObject(vehicle.root);
    const size = box.getSize(new THREE.Vector3());
    const z = size.z * 0.36;
    const headY = size.y * 0.24;
    const tailY = size.y * 0.3;

    const addLens = (x, y, side, geometry, material) => {
      const lens = new THREE.Mesh(geometry, material);
      lens.position.set(x, y, side);
      lens.rotation.y = Math.PI / 2;
      vehicle.root.add(lens);
      vehicle.nightLights.push(lens);
    };

    addLens(
      box.max.x + 0.02,
      headY,
      z,
      HEADLIGHT_GEOMETRY,
      HEADLIGHT_LENS
    );
    addLens(
      box.max.x + 0.02,
      headY,
      -z,
      HEADLIGHT_GEOMETRY,
      HEADLIGHT_LENS
    );
    addLens(
      box.min.x - 0.02,
      tailY,
      z,
      TAILLIGHT_GEOMETRY,
      TAILLIGHT_LENS
    );
    addLens(
      box.min.x - 0.02,
      tailY,
      -z,
      TAILLIGHT_GEOMETRY,
      TAILLIGHT_LENS
    );

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

  placeVehicle(vehicle, rotateWheels = true) {
    const progress = THREE.MathUtils.clamp(vehicle.motion.progress, 0, 1);
    const point = vehicle.path.getPointAt(progress, vehicle.pathPoint);
    const tangent = vehicle.path.getTangentAt(progress, vehicle.pathTangent);

    // Right-hand traffic. Because the route itself includes the return trip,
    // this places the truck in the other lane when it retraces the road.
    point.x -= tangent.z * LANE_OFFSET;
    point.z += tangent.x * LANE_OFFSET;

    const distance = rotateWheels
      ? point.distanceTo(vehicle.lastPosition)
      : 0;

    vehicle.root.position.copy(point);
    vehicle.root.rotation.y = Math.atan2(-tangent.z, tangent.x);

    if (distance > 0 && distance < 4 && vehicle.wheelRadius > 0) {
      const rotation = distance / vehicle.wheelRadius;

      vehicle.wheels.forEach((wheel) => {
        wheel.rotation.x += rotation;
      });
    }

    vehicle.lastPosition.copy(point);
  }

  startDrive(vehicle, time) {
    const duration = (vehicle.path.getLength() / vehicle.speed) * 1000;

    vehicle.tween = new Tween(vehicle.motion, false)
      .to({ progress: 1 }, duration)
      .easing(Easing.Linear.None)
      .onUpdate(() => {
        this.placeVehicle(vehicle);
      })
      .onComplete(() => {
        this.removeVehicle(vehicle);
      })
      .start(time);
  }

  removeVehicle(vehicle) {
    vehicle.tween?.stop();
    vehicle.tween = null;
    vehicle.root.removeFromParent();

    const index = this.vehicles.indexOf(vehicle);

    if (index !== -1) {
      this.vehicles.splice(index, 1);
    }
  }

  update(time) {
    if (!this.ready) {
      return;
    }

    if (this.nextSpawnAt === null) {
      this.nextSpawnAt = time;
    }

    if (time >= this.nextSpawnAt) {
      this.addVehicle(time);
      this.nextSpawnAt = time + SPAWN_INTERVAL_MS;
    }

    this.vehicles.slice().forEach((vehicle) => {
      vehicle.tween?.update(time);
    });
  }
}
