import * as THREE from 'three';

const DAY_BACKGROUND = 0x87ceeb;
const NIGHT_BACKGROUND = 0x1c2a42;
const DAY_WATER_COLOR = 0x14505c;
const NIGHT_WATER_COLOR = 0x0c2836;
const DAY_SUN_COLOR = 0x77aacc;
const NIGHT_SUN_COLOR = 0x6a7e9a;

export function enableShadows(object, cast = true) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (child.name === 'ShipCollision') {
      return;
    }

    if (child.material && child.material.visible === false) {
      return;
    }

    child.castShadow = cast;
    child.receiveShadow = true;
  });
}

export class Lighting {
  constructor({ scene, sea, hemi, sun, dock, crane, truck }) {
    this.scene = scene;
    this.sea = sea;
    this.hemi = hemi;
    this.sun = sun;
    this.dock = dock;
    this.crane = crane;
    this.truck = truck;
    this.isNight = false;

    this.moon = new THREE.DirectionalLight(0xa8bdd8, 0.85);
    this.moon.name = 'Moon';
    this.moon.position.set(-40, 60, -30);
    this.moon.visible = false;
    this.scene.add(this.moon);

    this.setupSun();
    this.sea.castShadow = false;
    this.sea.receiveShadow = true;
    this.setDayNight(false);
  }

  setupSun() {
    this.sun.color.set(0xffffff);
    this.sun.intensity = 2.6;
    this.sun.position.set(60, 80, 40);
    this.sun.target.position.set(0, 2, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;

    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -125;
    shadowCamera.right = 125;
    shadowCamera.top = 125;
    shadowCamera.bottom = -125;
    shadowCamera.near = 10;
    shadowCamera.far = 280;
    shadowCamera.updateProjectionMatrix();

    this.scene.add(this.sun.target);
  }

  toggleDayNight() {
    this.setDayNight(!this.isNight);
  }

  setDayNight(isNight) {
    this.isNight = isNight;

    this.hemi.color.set(isNight ? 0x4a6288 : 0xffffff);
    this.hemi.groundColor.set(isNight ? 0x1c2430 : 0x445566);
    this.hemi.intensity = isNight ? 0.62 : 0.9;

    this.sun.visible = !isNight;
    this.moon.visible = isNight;

    this.scene.background.set(isNight ? NIGHT_BACKGROUND : DAY_BACKGROUND);

    const waterColor = isNight ? NIGHT_WATER_COLOR : DAY_WATER_COLOR;
    const sunColor = isNight ? NIGHT_SUN_COLOR : DAY_SUN_COLOR;
    const lightPosition = isNight ? this.moon.position : this.sun.position;

    this.sea.material.uniforms.waterColor.value.set(waterColor);
    this.sea.material.uniforms.sunColor.value.set(sunColor);
    this.sea.material.uniforms.sunDirection.value
      .copy(lightPosition)
      .normalize();

    this.dock.setLampsOn(isNight);
    this.crane.setLightsOn(isNight);
    this.truck.setLightsOn(isNight);
  }
}
