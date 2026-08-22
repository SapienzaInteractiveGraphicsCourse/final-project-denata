import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enableShadows } from './Lighting.js';

const BONE_NAMES = {
  hips: 'mixamorig1Hips',
  leftUpLeg: 'mixamorig1LeftUpLeg',
  leftLeg: 'mixamorig1LeftLeg',
  rightUpLeg: 'mixamorig1RightUpLeg',
  rightLeg: 'mixamorig1RightLeg',
  leftFoot: 'mixamorig1LeftFoot',
  rightFoot: 'mixamorig1RightFoot',
  leftArm: 'mixamorig1LeftArm',
  rightArm: 'mixamorig1RightArm',
  leftForeArm: 'mixamorig1LeftForeArm',
  rightForeArm: 'mixamorig1RightForeArm',
  rightHand: 'mixamorig1RightHand'
};

export class Worker {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Worker';
    this.model = null;
    this.bones = {};
    this.restPose = {};
    this.walkTime = 0;
    this.yawAxis = new THREE.Vector3(0, 1, 0);
    this.flashlightOn = false;
    this.flashlight = new THREE.Group();
    this.flashlight.name = 'Flashlight';
    this.flashlight.visible = false;
    this.flashlightLight = null;
    this.flashOffset = new THREE.Vector3(0.08, -0.02, 0.04);
    this.flashWorldPos = new THREE.Vector3();
    this.flashWorldQuat = new THREE.Quaternion();
    this.rootQuat = new THREE.Quaternion();
    this.root.add(this.flashlight);
    this.loading = Promise.all([
      this.loadModel(),
      this.loadFlashlight()
    ]);
  }

  async loadModel() {
    const loader = new FBXLoader();
    const model = await loader.loadAsync('/assets/models/man_work.fbx');

    // Imported Mixamo clips are ignored on purpose.
    model.animations = [];
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const scale = 1.75 / initialSize.y;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);

    this.model = model;
    this.root.add(model);
    model.updateMatrixWorld(true);

    this.setupBones(model);
    this.setupSkinnedMeshes(model);
    enableShadows(this.root);
  }

  setupBones(model) {
    Object.entries(BONE_NAMES).forEach(([key, name]) => {
      const bone = model.getObjectByName(name);
      if (!bone) {
        return;
      }
      this.bones[key] = bone;
      this.restPose[key] = bone.rotation.clone();
    });
  }

  setupSkinnedMeshes(model) {
    model.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.frustumCulled = false;
      }
    });
  }

  async loadFlashlight() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/assets/models/flashlight.glb');
    const model = gltf.scene;
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;
    model.scale.setScalar(0.28 / maxDim);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
      }
    });
    this.flashlight.add(model);

    const light = new THREE.SpotLight(0xfff2cc, 0, 18, 0.42, 0.4, 2);
    light.name = 'WorkerFlashlight';
    light.castShadow = false;
    const target = new THREE.Object3D();
    target.name = 'WorkerFlashlightTarget';
    target.position.set(0, 0, 1.5);
    this.flashlight.add(light);
    this.flashlight.add(target);
    light.target = target;
    this.flashlightLight = light;

    enableShadows(this.flashlight);
    this.setFlashlight(this.flashlightOn);
  }

  updateFlashlightPose() {
    const hand = this.bones.rightHand;

    if (!this.flashlightOn || !hand) {
      return;
    }

    hand.updateWorldMatrix(true, false);
    hand.getWorldPosition(this.flashWorldPos);
    hand.getWorldQuaternion(this.flashWorldQuat);
    this.flashOffset.set(0.08, 0.12, 0.04);
    this.flashOffset.applyQuaternion(this.flashWorldQuat);
    this.flashWorldPos.add(this.flashOffset);

    this.root.worldToLocal(this.flashWorldPos);
    this.flashlight.position.copy(this.flashWorldPos);

    this.root.getWorldQuaternion(this.rootQuat);
    this.flashlight.quaternion.copy(this.rootQuat).invert().multiply(this.flashWorldQuat);
    this.flashlight.rotateX(-Math.PI / 2);
  }

  toggleFlashlight() {
    if (this.flashlightOn) {
      this.putAwayFlashlight();
      return;
    }

    this.showFlashlight();
  }

  showFlashlight() {
    this.flashlightOn = true;
    this.flashlight.visible = true;
    this.setFlashlight(true);
    this.updateFlashlightPose();
  }

  putAwayFlashlight() {
    this.flashlightOn = false;
    this.flashlight.visible = false;
    this.setFlashlight(false);
  }

  setFlashlight(on) {
    if (!this.flashlightLight) {
      return;
    }

    this.flashlightLight.intensity = on ? 28 : 0;
    this.flashlightLight.visible = on;
  }

  update(deltaTime, walking = false, firstPerson = false) {
    if (!this.bones.leftUpLeg || !this.bones.rightUpLeg) {
      return;
    }

    if (walking) {
      this.walkTime += deltaTime * 4;
    } else {
      this.walkTime = 0;
    }
    const swing = Math.sin(this.walkTime) * 0.3;
    const other = -swing;
    const kneeBase = 0.05;
    const leftKnee = kneeBase + Math.max(0, -swing) * 0.35;
    const rightKnee = kneeBase + Math.max(0, swing) * 0.35;

    this.bones.leftUpLeg.rotation.x = this.restPose.leftUpLeg.x + swing;
    this.bones.rightUpLeg.rotation.x = this.restPose.rightUpLeg.x + other;
    this.bones.leftLeg.rotation.x = this.restPose.leftLeg.x + leftKnee;
    this.bones.rightLeg.rotation.x = this.restPose.rightLeg.x + rightKnee;

    if (this.bones.leftArm && this.bones.rightArm) {
      if (firstPerson) {
        this.bones.leftArm.rotation.x = this.restPose.leftArm.x;
        this.bones.rightArm.rotation.x = this.restPose.rightArm.x;
        this.bones.leftArm.rotation.y = 0.7;
        this.bones.rightArm.rotation.y = -0.7;
        this.bones.leftArm.rotation.z = 1.4;
        this.bones.rightArm.rotation.z = -1.4;
      } else {
        const armDown = 1.2;
        const armSwingAmount = 0.8;

        this.bones.leftArm.rotation.x = this.restPose.leftArm.x + armDown;
        this.bones.rightArm.rotation.x = this.restPose.rightArm.x + armDown;
        this.bones.leftArm.rotation.y = this.restPose.leftArm.y;
        this.bones.rightArm.rotation.y = this.restPose.rightArm.y;
        this.bones.leftArm.rotation.z = this.restPose.leftArm.z + swing * armSwingAmount;
        this.bones.rightArm.rotation.z = this.restPose.rightArm.z + swing * armSwingAmount;
      }
    }

    if (this.bones.leftForeArm && this.bones.rightForeArm) {
      if (firstPerson) {
        this.bones.leftForeArm.rotation.x = this.restPose.leftForeArm.x;
        this.bones.rightForeArm.rotation.x = this.restPose.rightForeArm.x;
        this.bones.leftForeArm.rotation.z = 0.4;
        this.bones.rightForeArm.rotation.z = -0.4;
      } else {
        this.bones.leftForeArm.rotation.x = this.restPose.leftForeArm.x + 0.15;
        this.bones.rightForeArm.rotation.x = this.restPose.rightForeArm.x + 0.15;
        this.bones.leftForeArm.rotation.z = this.restPose.leftForeArm.z;
        this.bones.rightForeArm.rotation.z = this.restPose.rightForeArm.z;
      }
    }

    if (this.bones.hips) {
      this.bones.hips.rotation.y = this.restPose.hips.y + Math.sin(this.walkTime) * 0.04;
    }

    if (this.bones.rightHand && this.restPose.rightHand) {
      if (this.flashlightOn) {
        this.bones.rightHand.rotation.x = this.restPose.rightHand.x;
        this.bones.rightHand.rotation.y = this.restPose.rightHand.y + 0.7;
        this.bones.rightHand.rotation.z = this.restPose.rightHand.z - 0.55;
      } else {
        this.bones.rightHand.rotation.copy(this.restPose.rightHand);
      }
    }
    this.updateFlashlightPose();
  }

  getCameraPose(outPos, outTarget) {
    const { x, y, z } = this.root.position;
    const yaw = this.root.rotation.y;

    outTarget.set(0, 1.62, 0.2);
    outTarget.applyAxisAngle(this.yawAxis, yaw);
    outTarget.x += x;
    outTarget.y += y;
    outTarget.z += z;

    outPos.set(0, 1.85, -5.4);
    outPos.applyAxisAngle(this.yawAxis, yaw);
    outPos.x += x;
    outPos.y += y;
    outPos.z += z;
  }

  getFirstPersonPose(outPos, outTarget) {
    const { x, y, z } = this.root.position;
    const yaw = this.root.rotation.y;

    outPos.set(0, 1.3, 0.08);
    outPos.applyAxisAngle(this.yawAxis, yaw);
    outPos.x += x;
    outPos.y += y;
    outPos.z += z;

    outTarget.set(0, 0.95, 3.2);
    outTarget.applyAxisAngle(this.yawAxis, yaw);
    outTarget.x += x;
    outTarget.y += y;
    outTarget.z += z;
  }

  move(deltaTime, forward, turn) {
    this.root.rotation.y += turn * 1.6 * deltaTime;

    if (forward === 0) {
      return false;
    }

    this.root.translateZ(4.5 * forward * deltaTime);
    this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, -70, 25);
    this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, 10, 72);
    return true;
  }
}
