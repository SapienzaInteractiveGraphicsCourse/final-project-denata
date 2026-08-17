import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import { CargoSlots } from './CargoSlots.js';

export class Truck {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Truck';
    this.model = null;
    this.state = 'loading';
    this.tween = null;
    this.motion = { progress: 0 };
    this.wheels = [];
    this.wheelRadius = 0;
    this.departureTimer = null;
    this.onDeparted = null;
    this.blockerElement = null;
    this.pausedAt = null;
    this.pauseOffset = 0;
    this.pendingMove = null;
    this.activePath = null;

    this.cargoRoot = new THREE.Group();
    this.cargoRoot.name = 'TruckCargo';
    this.root.add(this.cargoRoot);

    this.slots = new CargoSlots(this.cargoRoot, [
      {
        id: 'T1',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: Math.PI / 2
      }
    ], 1);

    const roadHeight = 2.06;
    const turnOffset = 8 * 0.5522847498;

    this.arrivalPath = new THREE.CurvePath();
    this.arrivalPath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-96, roadHeight, 20),
        new THREE.Vector3(-8, roadHeight, 20)
      )
    );
    this.arrivalPath.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-8, roadHeight, 20),
        new THREE.Vector3(-8 + turnOffset, roadHeight, 20),
        new THREE.Vector3(0, roadHeight, 28 - turnOffset),
        new THREE.Vector3(0, roadHeight, 28)
      )
    );
    this.arrivalPath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(0, roadHeight, 28),
        new THREE.Vector3(0, roadHeight, 42)
      )
    );

    this.departurePath = new THREE.CurvePath();
    this.departurePath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(0, roadHeight, 42),
        new THREE.Vector3(0, roadHeight, 56)
      )
    );
    this.departurePath.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, roadHeight, 56),
        new THREE.Vector3(0, roadHeight, 56 + turnOffset),
        new THREE.Vector3(-8 + turnOffset, roadHeight, 64),
        new THREE.Vector3(-8, roadHeight, 64)
      )
    );
    this.departurePath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-8, roadHeight, 64),
        new THREE.Vector3(-24, roadHeight, 64)
      )
    );
    this.departurePath.add(
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-24, roadHeight, 64),
        new THREE.Vector3(-24 - turnOffset, roadHeight, 64),
        new THREE.Vector3(-32, roadHeight, 72 - turnOffset),
        new THREE.Vector3(-32, roadHeight, 72)
      )
    );
    this.departurePath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-32, roadHeight, 72),
        new THREE.Vector3(-32, roadHeight, 150)
      )
    );

    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      '/assets/models/trucks.glb',
      (gltf) => {
        const model = gltf.scene;
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const targetLength = 9;
        const scale = targetLength / initialSize.z;

        model.scale.setScalar(scale);
        model.rotation.y = Math.PI / 2;
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        model.position.set(-center.x, -box.min.y, -center.z);
        this.model = model;
        this.wheels = ['FR', 'FL', 'RL', 'RR']
          .map((name) => model.getObjectByName(name))
          .filter(Boolean);
        this.root.add(model);
        model.updateMatrixWorld(true);

        this.placeCargoOnTrailer(model);

        this.setProgress(0, 1);
        this.root.updateMatrixWorld(true);

        if (this.wheels.length > 0) {
          const wheelBox = new THREE.Box3().setFromObject(this.wheels[0]);
          const wheelSize = wheelBox.getSize(new THREE.Vector3());
          this.wheelRadius = wheelSize.y / 2;
        }

        this.root.visible = true;
        this.state = 'parked';
      },
      undefined,
      (error) => {
        console.error('Error loading truck:', error);
      }
    );
  }

  placeCargoOnTrailer(model) {
    this.cargoRoot.position.set(-1, 1.65, 0);
    return;
  }

  setProgress(
    progress,
    direction,
    path = this.departurePath,
    rotateWheels = false
  ) {
    const point = path.getPointAt(progress);
    const tangent = path.getTangentAt(progress).multiplyScalar(direction);
    const distance = rotateWheels ? point.distanceTo(this.root.position) : 0;

    this.root.position.copy(point);
    this.root.rotation.y = Math.atan2(-tangent.z, tangent.x);

    if (distance > 0 && this.wheelRadius > 0) {
      const rotation = distance / this.wheelRadius;

      this.wheels.forEach((wheel) => {
        wheel.rotation.x += rotation;
      });
    }
  }

  animateTo(
    targetProgress,
    direction,
    onComplete,
    path = this.departurePath,
    duration = 6000
  ) {
    this.pausedAt = null;
    this.pauseOffset = 0;
    this.tween = new Tween(this.motion, false)
      .to({ progress: targetProgress }, duration)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(() => {
        this.setProgress(this.motion.progress, direction, path, true);
      })
      .onComplete(() => {
        this.tween = null;
        this.hideBlocker();
        onComplete();
      })
      .start();
  }

  depart() {
    if (this.state === 'departing' || this.pendingMove === 'depart') {
      return;
    }

    if (this.state !== 'parked') {
      return;
    }

    clearTimeout(this.departureTimer);
    this.departureTimer = null;
    this.pendingMove = 'depart';
  }

  arrive() {
    if (this.state === 'arriving' || this.pendingMove === 'arrive') {
      return;
    }

    if (this.state !== 'absent') {
      return;
    }

    this.pendingMove = 'arrive';
  }

  startDepart() {
    this.pendingMove = null;
    this.activePath = this.departurePath;
    this.state = 'departing';
    this.motion.progress = 0;
    this.animateTo(
      1,
      1,
      () => {
        this.root.visible = false;
        this.state = 'absent';
        this.activePath = null;
        this.onDeparted?.();
      },
      this.departurePath,
      8000
    );
  }

  startArrive() {
    this.pendingMove = null;
    this.activePath = this.arrivalPath;
    this.state = 'arriving';
    this.motion.progress = 0;
    this.root.visible = true;
    this.setProgress(0, 1, this.arrivalPath);
    this.animateTo(
      1,
      1,
      () => {
        this.state = 'parked';
        this.activePath = null;
      },
      this.arrivalPath,
      9000
    );
  }

  tryStartPendingMove(physics) {
    if (!this.pendingMove || !physics) {
      return;
    }

    const path = this.pendingMove === 'depart'
      ? this.departurePath
      : this.arrivalPath;

    if (physics.isPathBlocked(this, path)) {
      this.showBlocker();
      return;
    }

    this.hideBlocker();

    if (this.pendingMove === 'depart') {
      this.startDepart();
    } else {
      this.startArrive();
    }
  }

  toggle() {
    if (this.state === 'parked') {
      this.depart();
    } else if (this.state === 'absent') {
      this.arrive();
    }
  }

  scheduleDeparture() {
    clearTimeout(this.departureTimer);
    this.departureTimer = setTimeout(() => this.depart(), 500);
  }

  showBlocker() {
    if (!this.blockerElement) {
      return;
    }

    this.blockerElement.textContent =
      'Move the container blocking the road so the truck can pass.';
    this.blockerElement.hidden = false;
  }

  hideBlocker() {
    if (!this.blockerElement) {
      return;
    }

    this.blockerElement.hidden = true;
  }

  update(time, physics) {
    if (this.pendingMove) {
      this.tryStartPendingMove(physics);

      if (this.pendingMove) {
        return;
      }
    }

    const moving = this.state === 'arriving' || this.state === 'departing';
    const blocked = moving
      && physics?.isPathBlocked(this, this.activePath, this.motion.progress);

    if (blocked) {
      this.showBlocker();
      this.pausedAt = this.pausedAt ?? time;
      return;
    }

    if (this.pausedAt != null) {
      this.pauseOffset += time - this.pausedAt;
      this.pausedAt = null;
    }

    this.hideBlocker();
    this.tween?.update(time - this.pauseOffset);
  }
}
