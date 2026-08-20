import * as THREE from 'three';

const VIEW_IDS = ['overview', 'crane', 'cabin', 'ship', 'truck'];

const PRESETS = {
  overview: {
    position: new THREE.Vector3(0, 25, 85),
    target: new THREE.Vector3(0, 4, 26),
    minDistance: 16,
    maxDistance: 88,
    minPolarAngle: 0.18,
    maxPolarAngle: Math.PI / 2 - 0.12,
    panCenter: new THREE.Vector3(6, 4, 30),
    panRadius: 34
  },
  crane: {
    offset: new THREE.Vector3(18, 10, 14),
    minDistance: 10,
    maxDistance: 36,
    minPolarAngle: 0.32,
    maxPolarAngle: Math.PI / 2 - 0.22,
    panRadius: 7,
    follow: true
  },
  cabin: {
    firstPerson: true,
    minDistance: 1,
    maxDistance: 4,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI
  },
  // From the water looking inland so the crane stays in frame behind the ship.
  ship: {
    position: new THREE.Vector3(12, 25, -38),
    target: new THREE.Vector3(12, 5, 18),
    minDistance: 18,
    maxDistance: 52,
    minPolarAngle: 0.22,
    maxPolarAngle: Math.PI / 2 - 0.1,
    panCenter: new THREE.Vector3(12, 5, 14),
    panRadius: 12
  },
  // High view of the arrival road, dock and central depot.
  truck: {
    position: new THREE.Vector3(-55, 50, 90),
    target: new THREE.Vector3(-12, 2, 32),
    minDistance: 28,
    maxDistance: 95,
    minPolarAngle: 0.22,
    maxPolarAngle: Math.PI / 2 - 0.12,
    panCenter: new THREE.Vector3(-16, 4, 32),
    panRadius: 22
  }
};

export class CameraViews {
  constructor({ camera, controls, crane }) {
    this.camera = camera;
    this.controls = controls;
    this.crane = crane;
    this.viewId = 'overview';
    this.switchT = 1;
    this.fromPos = new THREE.Vector3();
    this.fromTarget = new THREE.Vector3();
    this.toPos = new THREE.Vector3();
    this.toTarget = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.lastFocus = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.buttons = [];

    this.apply('overview', true);
    this.bindUi();
  }

  bindUi() {
    this.buttons = [...document.querySelectorAll('#cameraViews [data-view]')];

    this.buttons.forEach((button) => {
      button.addEventListener('click', () => this.setView(button.dataset.view));
    });

    window.addEventListener('keydown', (event) => {
      if (event.repeat) {
        return;
      }

      const index = Number(event.key) - 1;

      if (index >= 0 && index < VIEW_IDS.length) {
        this.setView(VIEW_IDS[index]);
      }
    });

    this.syncButtons();
  }

  setView(viewId) {
    if (!PRESETS[viewId] || viewId === this.viewId) {
      return;
    }

    this.viewId = viewId;
    this.apply(viewId, false);
    this.syncButtons();
  }

  apply(viewId, snap) {
    const preset = PRESETS[viewId];

    this.controls.minDistance = preset.minDistance;
    this.controls.maxDistance = preset.maxDistance;
    this.controls.minPolarAngle = preset.minPolarAngle;
    this.controls.maxPolarAngle = preset.maxPolarAngle;
    this.controls.enableRotate = !preset.firstPerson;
    this.controls.enablePan = !preset.firstPerson;
    this.controls.enableZoom = !preset.firstPerson;
    this.controls.enableDamping = false;

    this.fillPose(preset, this.toPos, this.toTarget);

    if (snap) {
      this.camera.position.copy(this.toPos);
      this.controls.target.copy(this.toTarget);
      this.controls.update();
      this.controls.enableDamping = true;
      this.switchT = 1;
      return;
    }

    this.fromPos.copy(this.camera.position);
    this.fromTarget.copy(this.controls.target);
    this.switchT = 0;
  }

  fillPose(preset, outPos, outTarget) {
    if (preset.firstPerson) {
      this.crane.getCabinPose(outPos, outTarget);
      return;
    }

    if (preset.follow) {
      this.crane.getCameraFocus(outTarget);
      outPos.copy(outTarget).add(preset.offset);
      this.lastFocus.copy(outTarget);
      return;
    }

    outPos.copy(preset.position);
    outTarget.copy(preset.target);
  }

  clampTarget(preset) {
    const target = this.controls.target;

    if (preset.follow) {
      this.offset.copy(target).sub(this.lastFocus);

      if (this.offset.length() > preset.panRadius) {
        this.offset.setLength(preset.panRadius);
      }

      target.copy(this.lastFocus).add(this.offset);
      return;
    }

    this.offset.copy(target).sub(preset.panCenter);
    this.offset.y = 0;

    if (this.offset.length() > preset.panRadius) {
      this.offset.setLength(preset.panRadius);
    }

    target.x = preset.panCenter.x + this.offset.x;
    target.z = preset.panCenter.z + this.offset.z;
    target.y = THREE.MathUtils.clamp(target.y, 1, 14);
  }

  update(deltaTime) {
    const preset = PRESETS[this.viewId];

    if (this.switchT < 1) {
      if (preset.follow || preset.firstPerson) {
        this.fillPose(preset, this.toPos, this.toTarget);
      }

      this.switchT = Math.min(1, this.switchT + deltaTime / 0.2);
      const t = this.switchT * this.switchT * (3 - 2 * this.switchT);

      this.camera.position.lerpVectors(this.fromPos, this.toPos, t);
      this.controls.target.lerpVectors(this.fromTarget, this.toTarget, t);

      if (this.switchT >= 1) {
        this.controls.enableDamping = !preset.firstPerson;
      }
    } else if (preset.firstPerson) {
      this.crane.getCabinPose(this.camera.position, this.controls.target);
      this.camera.lookAt(this.controls.target);
      return;
    } else if (preset.follow) {
      this.crane.getCameraFocus(this.focus);
      this.offset.copy(this.camera.position).sub(this.controls.target);
      const panX = this.controls.target.x - this.lastFocus.x;
      const panY = this.controls.target.y - this.lastFocus.y;
      const panZ = this.controls.target.z - this.lastFocus.z;

      this.controls.target.copy(this.focus);
      this.controls.target.x += panX;
      this.controls.target.y += panY;
      this.controls.target.z += panZ;
      this.lastFocus.copy(this.focus);
      this.camera.position.copy(this.controls.target).add(this.offset);
    }

    if (preset.firstPerson) {
      this.camera.lookAt(this.controls.target);
      return;
    }

    this.clampTarget(preset);
    this.controls.update();
  }

  syncButtons() {
    this.buttons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === this.viewId);
    });
  }
}
