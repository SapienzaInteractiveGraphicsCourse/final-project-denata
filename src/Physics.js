import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CONTAINER_SIZE } from './ContainerManager.js';

const GRAVITY = 18;
export const GROUND_Y = 2;
const OVERLAP_MARGIN = 0.02;
const GROUP_CARGO = 1;
const GROUP_CRANE = 2;
const GROUP_GROUND = 4;
const GROUP_SPREADER = 8;
const GROUP_TRUCK = 16;
const HELD_KNOCK_SPEED = 2;
const PATH_SAMPLE_SPACING = 3;
const CARGO_MASK = GROUP_CARGO | GROUP_GROUND | GROUP_CRANE | GROUP_SPREADER | GROUP_TRUCK;

export class Physics {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -GRAVITY, 0);
    this.world.defaultContactMaterial.friction = 0.6;
    this.world.defaultContactMaterial.restitution = 0.1;
    this.containers = [];
    this.kinematicMeshes = [];
    this.heldCargo = null;
    this.craneAdded = false;
    this.truckAdded = false;
    this.truck = null;
    this.truckBody = null;
    this.truckLocalBoxes = [];
    this.shipHull = null;
    this.pendingKnocks = new Set();
    this.onKnockFree = null;
    this.centerOffset = new THREE.Vector3(0, CONTAINER_SIZE.y / 2, 0);
    this.worldCenter = new THREE.Vector3();
    this.worldQuaternion = new THREE.Quaternion();
    this.boxCenter = new THREE.Vector3();
    this.boxSize = new THREE.Vector3();
    this.pathPoint = new THREE.Vector3();
    this.pathTangent = new THREE.Vector3();
    this.poseMatrix = new THREE.Matrix4();
    this.poseQuaternion = new THREE.Quaternion();
    this.poseScale = new THREE.Vector3(1, 1, 1);
    this.upAxis = new THREE.Vector3(0, 1, 0);

    this.world.addEventListener('beginContact', (event) => {
      this.handleContact(event.bodyA, event.bodyB);
    });
  }

  addStaticBox(center, size) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
      collisionFilterGroup: GROUP_GROUND,
      collisionFilterMask: GROUP_CARGO
    });

    body.position.set(center.x, center.y, center.z);
    this.world.addBody(body);
    return body;
  }

  addKinematicBox(mesh, group = GROUP_CRANE) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.getSize(this.boxSize);

    const body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(
        this.boxSize.x / 2,
        this.boxSize.y / 2,
        this.boxSize.z / 2
      )),
      collisionFilterGroup: group,
      collisionFilterMask: GROUP_CARGO
    });

    this.world.addBody(body);
    this.kinematicMeshes.push({ mesh, body });
    this.copyAabbToBody(mesh, body, 0);
    return body;
  }

  addDock(dock) {
    dock.platform.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(dock.platform);
    box.getCenter(this.boxCenter);
    box.getSize(this.boxSize);
    this.addStaticBox(this.boxCenter.clone(), this.boxSize.clone());
  }

  addShip(ship) {
    this.shipHull = ship.hull;
    this.addKinematicBox(ship.hull, GROUP_GROUND);
  }

  addCrane(crane) {
    if (this.craneAdded || !crane.parts.Crane_Spreader) {
      return;
    }

    this.addKinematicBox(crane.parts.Base_Base_Platform);
    this.addKinematicBox(crane.parts.Crane_Tower);
    this.addKinematicBox(crane.parts.Crane_Spreader, GROUP_SPREADER);
    this.craneAdded = true;
  }

  // Two boxes in truck-root space: short tall cabin in front, long low bed at the rear.
  addTruck(truck) {
    if (this.truckAdded || !truck?.model) {
      return;
    }

    const localBox = this.getLocalBox(truck.model, truck.root);
    // Cargo sits on the rear bed (long axis along X). Cabin is only the remaining front.
    const splitX = THREE.MathUtils.clamp(
      truck.cargoRoot.position.x + CONTAINER_SIZE.z / 2 + 0.15,
      localBox.min.x,
      localBox.max.x
    );
    const bedHeight = truck.cargoRoot.position.y;
    const cabinBox = new THREE.Box3(
      new THREE.Vector3(Math.max(splitX, localBox.min.x), localBox.min.y, localBox.min.z),
      new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.max.z)
    );
    const bedBox = new THREE.Box3(
      new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.min.z),
      new THREE.Vector3(Math.min(splitX, localBox.max.x), bedHeight, localBox.max.z)
    );

    this.truckLocalBoxes = [cabinBox, bedBox];
    this.truckBody = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      mass: 0,
      collisionFilterGroup: GROUP_TRUCK,
      collisionFilterMask: GROUP_CARGO
    });

    this.truckLocalBoxes.forEach((box) => {
      box.getCenter(this.boxCenter);
      box.getSize(this.boxSize);
      this.truckBody.addShape(
        new CANNON.Box(new CANNON.Vec3(
          this.boxSize.x / 2,
          this.boxSize.y / 2,
          this.boxSize.z / 2
        )),
        new CANNON.Vec3(this.boxCenter.x, this.boxCenter.y, this.boxCenter.z)
      );
    });

    this.world.addBody(this.truckBody);
    this.truck = truck;
    this.truckAdded = true;
    this.copyTruckToBody(0);
  }

  addContainer(cargo, state = 'slotted') {
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(
        CONTAINER_SIZE.x / 2,
        CONTAINER_SIZE.y / 2,
        CONTAINER_SIZE.z / 2
      )),
      collisionFilterGroup: GROUP_CARGO,
      collisionFilterMask: CARGO_MASK
    });

    cargo.userData.body = body;
    cargo.userData.physicsState = state;
    this.containers.push(cargo);
    this.copyMeshToBody(cargo, body, 0);
    this.world.addBody(body);
    this.setState(cargo, state);
    return body;
  }

  removeContainer(cargo) {
    const body = cargo.userData.body;

    if (!body) {
      return;
    }

    this.world.removeBody(body);
    this.containers = this.containers.filter((item) => item !== cargo);
    cargo.userData.body = null;
    cargo.userData.physicsState = null;

    if (this.heldCargo === cargo) {
      this.heldCargo = null;
    }
  }

  setHeld(cargo) {
    this.setState(cargo, 'held');
  }

  setSlotted(cargo) {
    this.setState(cargo, 'slotted');
  }

  setFree(cargo) {
    this.setState(cargo, 'free');
  }

  setState(cargo, state) {
    const body = cargo.userData.body;

    if (!body) {
      return;
    }

    cargo.userData.physicsState = state;
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);

    if (state === 'free') {
      body.type = CANNON.Body.DYNAMIC;
      body.mass = 500;
      body.collisionFilterMask = CARGO_MASK;
    } else {
      body.type = CANNON.Body.KINEMATIC;
      body.mass = 0;
      body.collisionFilterMask = state === 'held'
        ? GROUP_CARGO | GROUP_GROUND | GROUP_CRANE | GROUP_TRUCK
        : CARGO_MASK;
    }

    body.updateMassProperties();
    this.copyMeshToBody(cargo, body, 0);
    body.velocity.set(0, 0, 0);
    body.wakeUp();
    this.heldCargo = state === 'held' ? cargo : this.heldCargo === cargo ? null : this.heldCargo;
  }

  getFreeCargos() {
    return this.containers.filter((cargo) => cargo.userData.physicsState === 'free');
  }

  copyMeshToBody(cargo, body, deltaTime) {
    cargo.updateMatrixWorld(true);
    this.worldCenter.copy(this.centerOffset);
    cargo.localToWorld(this.worldCenter);
    cargo.getWorldQuaternion(this.worldQuaternion);
    this.setBodyPose(body, this.worldCenter, this.worldQuaternion, deltaTime);
  }

  copyBodyToMesh(cargo, body) {
    this.worldQuaternion.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    );
    this.worldCenter.copy(this.centerOffset).applyQuaternion(this.worldQuaternion);
    cargo.position.set(
      body.position.x - this.worldCenter.x,
      body.position.y - this.worldCenter.y,
      body.position.z - this.worldCenter.z
    );
    cargo.quaternion.copy(this.worldQuaternion);
    cargo.scale.set(1, 1, 1);
  }

  copyAabbToBody(mesh, body, deltaTime) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.getCenter(this.boxCenter);
    this.setBodyPose(body, this.boxCenter, null, deltaTime);
  }

  copyTruckToBody(deltaTime) {
    if (!this.truckBody || !this.truck) {
      return;
    }

    this.truck.root.updateMatrixWorld(true);
    this.truck.root.getWorldPosition(this.worldCenter);
    this.truck.root.getWorldQuaternion(this.worldQuaternion);
    this.setBodyPose(this.truckBody, this.worldCenter, this.worldQuaternion, deltaTime);
  }

  setBodyPose(body, position, quaternion, deltaTime) {
    if (deltaTime > 0 && body.type === CANNON.Body.KINEMATIC) {
      body.velocity.set(
        (position.x - body.position.x) / deltaTime,
        (position.y - body.position.y) / deltaTime,
        (position.z - body.position.z) / deltaTime
      );
    }

    body.position.set(position.x, position.y, position.z);

    if (quaternion) {
      body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }
  }

  handleContact(bodyA, bodyB) {
    const cargoA = this.findCargo(bodyA);
    const cargoB = this.findCargo(bodyB);

    if (cargoA) {
      this.tryKnock(cargoA, cargoB);
    }

    if (cargoB) {
      this.tryKnock(cargoB, cargoA);
    }
  }

  findCargo(body) {
    return this.containers.find((cargo) => cargo.userData.body === body) ?? null;
  }

  tryKnock(target, hitter) {
    if (target.userData.physicsState !== 'slotted') {
      return;
    }

    const hitterState = hitter?.userData.physicsState;

    if (hitterState !== 'free' && hitterState !== 'held') {
      return;
    }

    this.pendingKnocks.add(target);
  }

  knockHeldOverlaps(speedOverride) {
    if (!this.heldCargo) {
      return;
    }

    const heldBody = this.heldCargo.userData.body;
    let speed = 0;

    if (speedOverride !== undefined) {
      speed = speedOverride;
    } else if (heldBody) {
      speed = heldBody.velocity.length();
    }

    if (speed < HELD_KNOCK_SPEED) {
      return;
    }

    const heldBox = new THREE.Box3().setFromObject(this.heldCargo);

    this.containers.forEach((cargo) => {
      if (cargo === this.heldCargo || cargo.userData.physicsState !== 'slotted') {
        return;
      }

      const otherBox = new THREE.Box3().setFromObject(cargo);

      if (heldBox.intersectsBox(otherBox)) {
        this.pendingKnocks.add(cargo);
      }
    });
  }

  flushKnocks() {
    this.pendingKnocks.forEach((cargo) => {
      this.onKnockFree?.(cargo);
    });
    this.pendingKnocks.clear();
  }

  // Kinematic vs kinematic has no Cannon response, so the crane stops with AABB checks.
  isCraneBlocked(crane, attemptedSpeed = 0) {
    const partBoxes = this.getCranePartBoxes(crane);

    if (partBoxes.length === 0) {
      return false;
    }

    if (crane.heldCargo) {
      const heldBox = new THREE.Box3().setFromObject(crane.heldCargo);

      if (heldBox.min.y < GROUND_Y) {
        this.knockHeldOverlaps(attemptedSpeed);
        return true;
      }
    }

    const obstacles = this.getTruckWorldBoxes();

    if (this.shipHull) {
      obstacles.push(new THREE.Box3().setFromObject(this.shipHull));
    }

    this.containers.forEach((cargo) => {
      if (cargo === crane.heldCargo) {
        return;
      }

      cargo.updateMatrixWorld(true);
      obstacles.push(new THREE.Box3().setFromObject(cargo));
    });

    for (let i = 0; i < partBoxes.length; i += 1) {
      for (let j = 0; j < obstacles.length; j += 1) {
        if (this.boxesOverlap(partBoxes[i], obstacles[j])) {
          if (crane.heldCargo) {
            this.knockHeldOverlaps(attemptedSpeed);
          }

          return true;
        }
      }
    }

    return false;
  }

  // Sample the path with the truck boxes so we stop before driving into a container.
  isPathBlocked(truck, path, fromProgress = 0) {
    if (!truck?.model || !path || this.truckLocalBoxes.length === 0) {
      return false;
    }

    const length = path.getLength() * (1 - fromProgress);
    const samples = Math.max(4, Math.ceil(length / PATH_SAMPLE_SPACING));
    const ownCargo = truck.slots.peek('T1');

    for (let index = 0; index <= samples; index += 1) {
      const progress = fromProgress + (1 - fromProgress) * (index / samples);
      path.getPointAt(progress, this.pathPoint);
      path.getTangentAt(progress, this.pathTangent);
      const yaw = Math.atan2(-this.pathTangent.z, this.pathTangent.x);
      const boxes = this.getTruckWorldBoxesAt(this.pathPoint, yaw);

      if (this.cargoHitsBoxes(boxes, ownCargo)) {
        return true;
      }
    }

    return false;
  }

  cargoHitsBoxes(truckBoxes, ownCargo) {
    if (truckBoxes.length === 0) {
      return false;
    }

    return this.containers.some((cargo) => {
      if (cargo === ownCargo) {
        return false;
      }

      cargo.updateMatrixWorld(true);
      const cargoBox = new THREE.Box3().setFromObject(cargo);
      return truckBoxes.some((truckBox) => this.boxesOverlap(cargoBox, truckBox));
    });
  }

  getCranePartBoxes(crane) {
    const parts = [crane.parts.Boom, crane.parts.Crane_Spreader];
    const boxes = [];

    if (crane.heldCargo) {
      parts.push(crane.heldCargo);
    }

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];

      if (!part) {
        continue;
      }

      part.updateMatrixWorld(true);
      boxes.push(new THREE.Box3().setFromObject(part));
    }

    return boxes;
  }

  getTruckWorldBoxes() {
    if (!this.truck || this.truckLocalBoxes.length === 0) {
      return [];
    }

    this.truck.root.updateMatrixWorld(true);
    this.truck.root.getWorldPosition(this.worldCenter);
    return this.getTruckWorldBoxesAt(this.worldCenter, this.truck.root.rotation.y);
  }

  getTruckWorldBoxesAt(position, yaw) {
    this.poseQuaternion.setFromAxisAngle(this.upAxis, yaw);
    this.poseMatrix.compose(position, this.poseQuaternion, this.poseScale);
  
    const boxes = [];
  
    for (let index = 0; index < this.truckLocalBoxes.length; index += 1) {
      const worldBox = this.truckLocalBoxes[index].clone();
      worldBox.applyMatrix4(this.poseMatrix);
      boxes.push(worldBox);
    }
  
    return boxes;
  }

  getLocalBox(mesh, parent) {
    parent.updateMatrixWorld(true);
    mesh.updateMatrixWorld(true);
  
    const box = new THREE.Box3().setFromObject(mesh);
    box.applyMatrix4(parent.matrixWorld.clone().invert());
    return box;
  }

  boxesOverlap(a, b) {
    return a.min.x < b.max.x - OVERLAP_MARGIN
      && a.max.x > b.min.x + OVERLAP_MARGIN
      && a.min.y < b.max.y - OVERLAP_MARGIN
      && a.max.y > b.min.y + OVERLAP_MARGIN
      && a.min.z < b.max.z - OVERLAP_MARGIN
      && a.max.z > b.min.z + OVERLAP_MARGIN;
  }

  update(deltaTime, crane, truck) {
    this.addCrane(crane);
    this.addTruck(truck);

    this.containers.forEach((cargo) => {
      if (cargo.userData.physicsState === 'free') {
        return;
      }

      this.copyMeshToBody(cargo, cargo.userData.body, deltaTime);
    });

    this.kinematicMeshes.forEach(({ mesh, body }) => {
      this.copyAabbToBody(mesh, body, deltaTime);
    });

    this.copyTruckToBody(deltaTime);
    this.world.step(1 / 60, deltaTime, 3);

    this.containers.forEach((cargo) => {
      if (cargo.userData.physicsState !== 'free') {
        return;
      }

      this.copyBodyToMesh(cargo, cargo.userData.body);
    });

    this.knockHeldOverlaps();
    this.flushKnocks();
  }
}
