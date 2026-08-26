import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GROUND_Y } from './Physics.js';
import { enableShadows } from './Lighting.js';

export class Crane {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Crane';
    this.model = null;
    this.parts = {};
    this.wheels = [];
    this.wheelRadius = 0;
    this.boomAnimation = null;
    this.lastUpdateTime = null;
    this.heldCargo = null;
    this.cargoAnchor = null;
    this.restUpperBodyYaw = 0;
    this.travelSpeed = 1.5;
    this.minTravelZ = 18;
    this.maxTravelZ = 50;
    this.nightLights = [];
    this.nightLightsOn = false;
    this.cabinAnchor = null;
    this.cabinForward = new THREE.Vector3();

    this.loading = this.loadModel();
  }

  async loadModel() {
    const loader = new GLTFLoader();

    const gltf = await loader.loadAsync(
      `${import.meta.env.BASE_URL}assets/models/Crane_Modified3.glb`
    );
    const model = gltf.scene;

    model.scale.setScalar(0.5885823965072632);
    model.rotation.y = -Math.PI ;
    model.updateMatrixWorld(true);

    const base = model.getObjectByName('Base_Base_Platform');
    const wheels = model.getObjectByName('Base_Crane_Wheel_Set');
    const baseBox = new THREE.Box3().setFromObject(base);
    const wheelBox = new THREE.Box3().setFromObject(wheels);
    const baseCenter = baseBox.getCenter(new THREE.Vector3());

    model.position.set(
      -baseCenter.x,
      -wheelBox.min.y,
      -baseCenter.z
    );

    const partNames = [
      'Crane_CTRL_Empty',
      'Base_Base_Platform',
      'Base_Crane_Wheel_Set',
      'Platform_Body',
      'Boom',
      'Cables_front_arcs',
      'Cable_rear_arcs',
      'Crane_Spreader',
      'Crane_Tower',
      'Installations',
      'Piston',
      'Rear_cables',
      'Upper_Cable_01',
      'Upper_Cable_02',
      'Upper_Cable_03',
      'Upper_Cable_04',
      'Upper_Cable_05',
      'Upper_Cable_06',
      'Vertical_Cables',
      'Wheel_01',
      'Wheel_02',
      'Wheel_03',
      'Wheel_04',
      'Wheel_05',
      'Wheel_06',
      'Wheel_07',
      'Wheel_08',
      'Wheel_09',
      'Wheel_10',
      'Wheel_11',
      'Wheel_12'
    ];

    partNames.forEach((name) => {
      this.parts[name] = model.getObjectByName(name);
    });

    // Keep the upper body facing the direction used before the crane was turned.
    this.parts.Platform_Body.rotation.y = Math.PI / 2;
    this.restUpperBodyYaw = this.parts.Platform_Body.rotation.y;

    this.model = model;
    this.root.add(model);
    this.root.updateWorldMatrix(true, true);
    this.setupWheels();
    this.setupBoomAnimation();
    this.setupLights();
    enableShadows(this.root);
  }

  setupWheels() {
    for (let index = 1; index <= 12; index += 1) {
      const name = `Wheel_${String(index).padStart(2, '0')}`;
      const wheel = this.parts[name];
      const parent = wheel.parent;
      const wheelBox = new THREE.Box3().setFromObject(wheel);
      const wheelCenter = wheelBox.getCenter(new THREE.Vector3());
      const wheelSize = wheelBox.getSize(new THREE.Vector3());
      const pivot = new THREE.Group();

      pivot.name = `${name}_Pivot`;
      pivot.position.copy(parent.worldToLocal(wheelCenter));
      parent.add(pivot);

      // attach() keeps the wheel in place when it becomes a child of the pivot.
      pivot.attach(wheel);
      this.wheels.push(pivot);

      if (this.wheelRadius === 0) {
        this.wheelRadius = wheelSize.y / 2;
      }
    }
  }

  setupLights() {
    const tower = this.parts.Crane_Tower;
    const spreader = this.parts.Crane_Spreader;
  
    const cabinLight = new THREE.PointLight(0xffe0b0, 0, 8, 2);
    cabinLight.name = 'CraneCabinLight';
    cabinLight.position.set(3.9, -14.0, 3.7);
    tower.add(cabinLight);
    this.nightLights.push(cabinLight);

    this.cabinAnchor = new THREE.Object3D();
    this.cabinAnchor.name = 'CabinView';
    this.cabinAnchor.position.copy(cabinLight.position);
    tower.add(this.cabinAnchor);
  
    const workLight = new THREE.SpotLight(0xfff2cc, 0, 24, 0.55, 0.35, 2);
    workLight.name = 'CraneWorkLight';
    workLight.castShadow = false;
  
    const workTarget = new THREE.Object3D();
    workTarget.name = 'CraneWorkLightTarget';
  
    spreader.geometry.computeBoundingBox();
    workLight.position.set(0, spreader.geometry.boundingBox.min.y - 0.4, 0);
    spreader.add(workLight);
    spreader.add(workTarget);
    spreader.updateMatrixWorld(true);
  
    const groundPoint = workLight.getWorldPosition(new THREE.Vector3());
    groundPoint.y = GROUND_Y;
    spreader.worldToLocal(groundPoint);
    workTarget.position.copy(groundPoint);
  
    workLight.target = workTarget;
    this.nightLights.push(workLight);
    this.setLightsOn(this.nightLightsOn);
  }

  setLightsOn(on) {
    this.nightLightsOn = on;

    this.nightLights.forEach((light) => {
      light.intensity = on ? (light.isSpotLight ? 70 : 22) : 0;
      light.visible = on;
    });
  }

  move(travelDirection, deltaTime) {
    const previousZ = this.root.position.z;
    const nextZ = previousZ
      + travelDirection * this.travelSpeed * deltaTime;

    this.root.position.z = THREE.MathUtils.clamp(
      nextZ,
      this.minTravelZ,
      this.maxTravelZ
    );

    const distance = this.root.position.z - previousZ;
    this.rotateWheels(distance);
  }

  rotateWheels(distance) {
    if (distance === 0 || this.wheelRadius === 0) {
      return;
    }

    const rotation = -distance / this.wheelRadius;

    this.wheels.forEach((wheel) => {
      wheel.rotation.x += rotation;
    });
  }

  setupBoomAnimation() {
    const platform = this.parts.Platform_Body;
    const boom = this.parts.Boom;
    const pistonEnds = this.getMeshEnds(this.parts.Piston, 'y');
    const verticalCableEnds = this.getMeshEnds(this.parts.Vertical_Cables, 'y');
    const spreader = this.parts.Crane_Spreader;
    const verticalBottom = new THREE.Vector3(
      spreader.position.x,
      verticalCableEnds.start.y,
      spreader.position.z
    );
    const verticalTop = new THREE.Vector3(
      spreader.position.x,
      verticalCableEnds.end.y,
      spreader.position.z
    );

    const pistonFixedAnchor = this.createAnchor(
      platform,
      pistonEnds.start,
      'Piston_Fixed_Anchor'
    );
    const pistonBoomAnchor = this.createBoomAnchor(
      pistonEnds.end,
      'Piston_Boom_Anchor'
    );

    const upperCables = [];

    for (let index = 1; index <= 6; index += 1) {
      const name = `Upper_Cable_${String(index).padStart(2, '0')}`;
      const mesh = this.parts[name];
      const ends = this.getMeshEnds(mesh, 'z');
      const fixedAnchor = this.createAnchor(
        platform,
        ends.start,
        `${name}_Fixed_Anchor`
      );
      const boomAnchor = this.createBoomAnchor(
        ends.end,
        `${name}_Boom_Anchor`
      );

      upperCables.push(
        this.createStretchablePart(
          mesh,
          ends.start,
          ends.end,
          fixedAnchor,
          boomAnchor
        )
      );
    }

    const verticalBottomAnchor = this.createAnchor(
      platform,
      verticalBottom,
      'Vertical_Cables_Bottom_Anchor'
    );
    const verticalBoomAnchor = this.createBoomAnchor(
      verticalTop,
      'Vertical_Cables_Boom_Anchor'
    );

    this.boomAnimation = {
      upperBody: platform,
      rotationSpeed: THREE.MathUtils.degToRad(15),
      boom,
      minAngle: THREE.MathUtils.degToRad(-70),
      maxAngle: THREE.MathUtils.degToRad(-5),
      speed: THREE.MathUtils.degToRad(12),
      piston: this.createStretchablePart(
        this.parts.Piston,
        pistonEnds.start,
        pistonEnds.end,
        pistonFixedAnchor,
        pistonBoomAnchor
      ),
      upperCables,
      verticalCables: {
        stretchablePart: this.createStretchablePart(
          this.parts.Vertical_Cables,
          verticalCableEnds.start,
          verticalCableEnds.end,
          verticalBottomAnchor,
          verticalBoomAnchor
        ),
        bottomAnchor: verticalBottomAnchor,
        bottomHeight: verticalBottom.y,
        minHeight: 0,
        maxHeight: 35,
        minCableLength: 2,
        hoistSpeed: 3
      },
      spreader,
      spreaderPosition: spreader.position.clone(),
      spreaderAnchorPosition: verticalBottom.clone()
    };

    this.setupCargoAnchor(spreader);
    this.updateBoomConnections();
  }

  // Hook point at the bottom of the spreader; held containers parent here.
  setupCargoAnchor(spreader) {
    this.cargoAnchor = new THREE.Object3D();
    this.cargoAnchor.name = 'CraneCargo';
    spreader.add(this.cargoAnchor);

    spreader.updateMatrixWorld(true);
    const spreaderBox = new THREE.Box3().setFromObject(spreader);
    // Hook = bottom center of the spreader, not the mesh origin.
    const bottom = spreaderBox.getCenter(new THREE.Vector3());
    bottom.y = spreaderBox.min.y;

    spreader.worldToLocal(bottom);
    this.cargoAnchor.position.copy(bottom);
  }

  // Hang the container from the hook, full size and aligned with the spreader.
  attachCargo(cargo) {
    if (!this.cargoAnchor || this.heldCargo) {
      return false;
    }

    this.cargoAnchor.add(cargo);
    this.cargoAnchor.updateMatrixWorld(true);

    // Undo the crane model scale so the container keeps its world size.
    const parentScale = this.cargoAnchor.getWorldScale(new THREE.Vector3());
    cargo.scale.setScalar(1 / parentScale.x);
    cargo.rotation.set(0, Math.PI / 2, 0);

    cargo.updateMatrixWorld(true);
    const height = new THREE.Box3().setFromObject(cargo).getSize(new THREE.Vector3()).y;
    // Origin is at the container bottom; move it down so the top touches the hook.
    const hangPosition = this.cargoAnchor.getWorldPosition(new THREE.Vector3());
    hangPosition.y -= height;
    cargo.position.copy(this.cargoAnchor.worldToLocal(hangPosition));

    this.heldCargo = cargo;

    return true;
  }

  // Unparent cargo but keep its world pose so it can fall or snap to a slot.
  detachCargo() {
    if (!this.heldCargo) {
      return null;
    }

    const cargo = this.heldCargo;
    this.heldCargo = null;
    this.root.parent.attach(cargo);

    return cargo;
  }

  // Used by cargo proximity checks; falls back to the spreader before the model loads.
  getSpreaderWorldPosition() {
    if (this.cargoAnchor) {
      return this.cargoAnchor.getWorldPosition(new THREE.Vector3());
    }

    const spreader = this.parts.Crane_Spreader;

    if (!spreader) {
      return null;
    }

    return spreader.getWorldPosition(new THREE.Vector3());
  }

  // Follow the rails only. Do not parent the camera to the rotating upper body.
  getCameraFocus(target = new THREE.Vector3()) {
    return target.set(
      this.root.position.x,
      this.root.position.y + 16,
      this.root.position.z
    );
  }

  // First-person seat: in front of the cabin glass, still tied to the crane.
  getCabinPose(position, target) {
    const { x, y, z } = this.root.position;

    if (this.cabinAnchor) {
      this.cabinAnchor.getWorldPosition(position);
    } else {
      position.set(x + 4, y + 13, z + 1);
    }

    const spreader = this.parts.Crane_Spreader;

    if (spreader) {
      spreader.getWorldPosition(target);
    } else {
      target.set(x - 20, 4, z);
    }

    this.cabinForward.copy(target).sub(position);

    if (this.cabinForward.lengthSq() > 0.0001) {
      this.cabinForward.normalize();
      position.addScaledVector(this.cabinForward, 4.5);
    }
  }

  getMeshEnds(mesh, axis) {
    const positions = mesh.geometry.attributes.position;
    mesh.geometry.computeBoundingBox();

    const box = mesh.geometry.boundingBox;
    const minimum = box.min[axis];
    const maximum = box.max[axis];
    const tolerance = (maximum - minimum) * 0.01;
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    let startCount = 0;
    let endCount = 0;

    for (let index = 0; index < positions.count; index += 1) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, index);

      if (point[axis] <= minimum + tolerance) {
        start.add(point);
        startCount += 1;
      }

      if (point[axis] >= maximum - tolerance) {
        end.add(point);
        endCount += 1;
      }
    }

    start.multiplyScalar(1 / startCount);
    end.multiplyScalar(1 / endCount);

    const platform = this.parts.Platform_Body;
    mesh.localToWorld(start);
    mesh.localToWorld(end);
    platform.worldToLocal(start);
    platform.worldToLocal(end);

    return { start, end };
  }

  createAnchor(parent, position, name) {
    const anchor = new THREE.Object3D();
    anchor.name = name;
    anchor.position.copy(position);
    parent.add(anchor);

    return anchor;
  }

  createBoomAnchor(position, name) {
    const platform = this.parts.Platform_Body;
    const boom = this.parts.Boom;
    const worldPosition = platform.localToWorld(position.clone());
    const boomPosition = boom.worldToLocal(worldPosition);

    return this.createAnchor(boom, boomPosition, name);
  }

  getAnchorPosition(anchor) {
    const worldPosition = anchor.getWorldPosition(new THREE.Vector3());
    return this.parts.Platform_Body.worldToLocal(worldPosition);
  }

  createStretchablePart(mesh, start, end, startAnchor, endAnchor) {
    const controller = new THREE.Group();
    controller.name = `${mesh.name}_Controller`;
    this.parts.Platform_Body.add(controller);

    this.pointController(controller, start, end, 1);
    // attach() changes the parent without changing the mesh's visible pose.
    controller.attach(mesh);

    return {
      controller,
      startAnchor,
      endAnchor,
      originalLength: start.distanceTo(end)
    };
  }

  pointController(controller, start, end, lengthScale) {
    const direction = end.clone().sub(start).normalize();
    const targetX = new THREE.Vector3(1, 0, 0);

    controller.position.copy(start);
    controller.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );

    // Keep the controller from twisting around its local Z axis.
    if (Math.abs(targetX.dot(direction)) > 0.95) {
      targetX.set(0, 1, 0);
    }

    targetX
      .addScaledVector(direction, -targetX.dot(direction))
      .normalize();

    const currentX = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(controller.quaternion);
    const rollCorrection = new THREE.Quaternion()
      .setFromUnitVectors(currentX, targetX);

    controller.quaternion.premultiply(rollCorrection);
    controller.scale.set(1, 1, lengthScale);
  }

  stretchPart(part) {
    const start = this.getAnchorPosition(part.startAnchor);
    const end = this.getAnchorPosition(part.endAnchor);
    const targetLength = start.distanceTo(end);
    const lengthScale = targetLength / part.originalLength;

    this.pointController(part.controller, start, end, lengthScale);
  }

  updateBoomConnections() {
    const animation = this.boomAnimation;
    this.stretchPart(animation.piston);
    animation.upperCables.forEach((cable) => this.stretchPart(cable));

    const verticalTop = this.getAnchorPosition(
      animation.verticalCables.stretchablePart.endAnchor
    );
    const verticalBottomAnchor = animation.verticalCables.bottomAnchor;
    const maximumHeight = Math.min(
      animation.verticalCables.maxHeight,
      verticalTop.y - animation.verticalCables.minCableLength
    );

    animation.verticalCables.bottomHeight = THREE.MathUtils.clamp(
      animation.verticalCables.bottomHeight,
      animation.verticalCables.minHeight,
      maximumHeight
    );

    verticalBottomAnchor.position.set(
      verticalTop.x,
      animation.verticalCables.bottomHeight,
      verticalTop.z
    );

    this.stretchPart(animation.verticalCables.stretchablePart);

    const spreaderOffset = verticalBottomAnchor.position
      .clone()
      .sub(animation.spreaderAnchorPosition);

    animation.spreader.position
      .copy(animation.spreaderPosition)
      .add(spreaderOffset);
  }

  getHeldMinY() {
    if (!this.heldCargo) {
      return null;
    }

    this.heldCargo.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(this.heldCargo).min.y;
  }

  tryMove(apply, restore, isBlocked, deltaTime) {
    const overlapBefore = isBlocked?.(0) ?? 0;
    const previousMinY = this.getHeldMinY();
    const from = this.heldCargo
      ? this.heldCargo.getWorldPosition(new THREE.Vector3())
      : null;

    apply();

    if (this.boomAnimation) {
      this.updateBoomConnections();
    }

    const nowMinY = this.getHeldMinY();
    const goingDown = previousMinY != null && nowMinY != null && nowMinY < previousMinY;
    const sank = goingDown && nowMinY < GROUND_Y;
    const speed = from && deltaTime > 0
      ? from.distanceTo(this.heldCargo.getWorldPosition(new THREE.Vector3())) / deltaTime
      : 0;
    const overlapAfter = isBlocked?.(speed) ?? 0;

    // Block this key if it stays in / enters a container. Other keys can still move.
    if (sank || (overlapAfter > 0 && overlapAfter >= overlapBefore - 0.0001)) {
      restore();

      if (this.boomAnimation) {
        this.updateBoomConnections();
      }
    }
  }

  update(
    time,
    boomDirection = 0, // W / S: raise / lower the boom
    rotationDirection = 0, // A / D: rotate the upper body
    travelDirection = 0, // up / down arrows: move along the dock
    hoistDirection = 0, // R / F: raise / lower the spreader
    isBlocked = null
  ) {
    const previousTime = this.lastUpdateTime ?? time;
    const deltaTime = Math.min((time - previousTime) / 1000, 0.1);
    this.lastUpdateTime = time;

    if (travelDirection !== 0) {
      const previousZ = this.root.position.z;
      const previousWheels = this.wheels.map((wheel) => wheel.rotation.x);

      this.tryMove(
        () => this.move(travelDirection, deltaTime),
        () => {
          this.root.position.z = previousZ;
          this.wheels.forEach((wheel, index) => {
            wheel.rotation.x = previousWheels[index];
          });
        },
        isBlocked,
        deltaTime
      );
    }

    if (!this.boomAnimation) {
      return;
    }

    const animation = this.boomAnimation;

    if (rotationDirection !== 0) {
      const previousYaw = animation.upperBody.rotation.y;

      this.tryMove(
        () => {
          animation.upperBody.rotation.y +=
            rotationDirection * animation.rotationSpeed * deltaTime;
        },
        () => {
          animation.upperBody.rotation.y = previousYaw;
        },
        isBlocked,
        deltaTime
      );
    }

    if (boomDirection !== 0) {
      const previousAngle = animation.boom.rotation.x;
      const heldMinY = this.getHeldMinY();
      const onDock = heldMinY != null && heldMinY <= GROUND_Y;

      this.tryMove(
        () => {
          animation.boom.rotation.x = THREE.MathUtils.clamp(
            previousAngle + boomDirection * animation.speed * deltaTime,
            animation.minAngle,
            animation.maxAngle
          );
          animation.boom.updateMatrix();
        },
        () => {
          animation.boom.rotation.x = previousAngle;
          animation.boom.updateMatrix();
        },
        isBlocked,
        deltaTime
      );
    }

    if (hoistDirection !== 0) {
      const previousHeight = animation.verticalCables.bottomHeight;
      const heldMinY = this.getHeldMinY();
      const onDock = heldMinY != null && heldMinY <= GROUND_Y;

      if (!(hoistDirection < 0 && onDock)) {
        this.tryMove(
          () => {
            animation.verticalCables.bottomHeight +=
              hoistDirection * animation.verticalCables.hoistSpeed * deltaTime;
          },
          () => {
            animation.verticalCables.bottomHeight = previousHeight;
          },
          isBlocked,
          deltaTime
        );
      }
    }
  }
}
