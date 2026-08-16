import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CONTAINER_SIZE } from './ContainerManager.js';

const GRAVITY = 18;
const GROUP_CARGO = 1;
const GROUP_CRANE = 2;
const GROUP_GROUND = 4;
const GROUP_SPREADER = 8;
const HELD_KNOCK_SPEED = 2;

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
    this.pendingKnocks = new Set();
    this.onKnockFree = null;
    this.centerOffset = new THREE.Vector3(0, CONTAINER_SIZE.y / 2, 0);
    this.worldCenter = new THREE.Vector3();
    this.worldQuaternion = new THREE.Quaternion();
    this.boxCenter = new THREE.Vector3();
    this.boxSize = new THREE.Vector3();

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
      collisionFilterMask: GROUP_CARGO | GROUP_GROUND | GROUP_CRANE | GROUP_SPREADER
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
      body.collisionFilterMask = GROUP_CARGO | GROUP_GROUND | GROUP_CRANE | GROUP_SPREADER;
    } else {
      body.type = CANNON.Body.KINEMATIC;
      body.mass = 0;
      body.collisionFilterMask = state === 'held'
        ? GROUP_CARGO | GROUP_GROUND | GROUP_CRANE
        : GROUP_CARGO | GROUP_GROUND | GROUP_CRANE | GROUP_SPREADER;
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

  knockHeldOverlaps() {
    if (!this.heldCargo) {
      return;
    }

    const heldBody = this.heldCargo.userData.body;
    const speed = heldBody?.velocity.length() ?? 0;

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

  update(deltaTime, crane) {
    this.addCrane(crane);

    this.containers.forEach((cargo) => {
      if (cargo.userData.physicsState === 'free') {
        return;
      }

      this.copyMeshToBody(cargo, cargo.userData.body, deltaTime);
    });

    this.kinematicMeshes.forEach(({ mesh, body }) => {
      this.copyAabbToBody(mesh, body, deltaTime);
    });

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
