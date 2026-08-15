import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
    this.maxTravelZ = 70;

    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      '/assets/models/Crane_Modified3.glb',
      (gltf) => {
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
        model.updateMatrixWorld(true);
        this.setupWheels();
        this.setupBoomAnimation();
      },
      undefined,
      (error) => {
        console.error('Error loading crane:', error);
      }
    );
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

  update(
    time,
    boomDirection = 0,
    rotationDirection = 0,
    travelDirection = 0,
    hoistDirection = 0
  ) {
    const previousTime = this.lastUpdateTime ?? time;
    const deltaTime = Math.min((time - previousTime) / 1000, 0.1);
    this.lastUpdateTime = time;

    this.move(travelDirection, deltaTime);

    if (!this.boomAnimation) {
      return;
    }

    const animation = this.boomAnimation;

    animation.upperBody.rotation.y +=
      rotationDirection * animation.rotationSpeed * deltaTime;

    animation.verticalCables.bottomHeight +=
      hoistDirection * animation.verticalCables.hoistSpeed * deltaTime;

    if (boomDirection !== 0) {
      const nextAngle = animation.boom.rotation.x
        + boomDirection * animation.speed * deltaTime;

      animation.boom.rotation.x = THREE.MathUtils.clamp(
        nextAngle,
        animation.minAngle,
        animation.maxAngle
      );
      animation.boom.updateMatrix();
    }

    if (boomDirection !== 0 || hoistDirection !== 0) {
      this.updateBoomConnections();
    }
  }
}
