import * as THREE from 'three';
import {
  FOG_NOON_COLOR,
  FOG_SUNRISE_COLOR,
  FOG_NIGHT_COLOR,
  MAP_RADIUS
} from './MapBounds.js';

const NOON = {
  background: 0x87ceeb,
  hemiSky: 0xffffff,
  hemiGround: 0x445566,
  hemiIntensity: 0.9,
  sunColor: 0xffffff,
  sunIntensity: 2.6,
  sunPosition: new THREE.Vector3(60, 80, 40),
  waterColor: 0x14505c,
  waterSun: 0x77aacc,
  fog: FOG_NOON_COLOR,
  zenith: 0x3d8fd4,
  mid: 0x87ceeb,
  glow: 0xb8d4e8,
  horizon: FOG_NOON_COLOR,
  sunriseStrength: 0
};

const SUNRISE = {
  background: 0x8e96a0,
  hemiSky: 0xc4b0b8,
  hemiGround: 0x4a5058,
  hemiIntensity: 0.68,
  sunColor: 0xffb088,
  sunIntensity: 1.55,
  sunPosition: new THREE.Vector3(70, 16, -110),
  waterColor: 0x1a3c48,
  waterSun: 0xffaa77,
  fog: FOG_SUNRISE_COLOR,
  zenith: 0x4a4854,
  mid: 0xb8929a,
  glow: 0xe87848,
  horizon: FOG_SUNRISE_COLOR,
  sunriseStrength: 1
};

const NIGHT = {
  background: 0x1c2a42,
  hemiSky: 0x4a6288,
  hemiGround: 0x1c2430,
  hemiIntensity: 0.62,
  waterColor: 0x0c2836,
  waterSun: 0x6a7e9a,
  fog: FOG_NIGHT_COLOR,
  zenith: 0x10161e,
  mid: 0x1a283c,
  glow: 0x2a3a52,
  horizon: FOG_NIGHT_COLOR,
  sunriseStrength: 0
};

function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(NOON.zenith) },
      uMid: { value: new THREE.Color(NOON.mid) },
      uSunrise: { value: new THREE.Color(NOON.glow) },
      uHorizon: { value: new THREE.Color(NOON.horizon) },
      uSunDirection: { value: NOON.sunPosition.clone().normalize() },
      uSunriseStrength: { value: NOON.sunriseStrength }
    },
    vertexShader: `
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uSunrise;
      uniform vec3 uHorizon;
      uniform vec3 uSunDirection;
      uniform float uSunriseStrength;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos - cameraPosition);
        float elev = dir.y;

        vec3 color = mix(uZenith, uMid, smoothstep(0.55, 0.14, elev));
        color = mix(color, uHorizon, smoothstep(0.16, -0.04, elev));

        vec2 az = normalize(dir.xz);
        vec2 sunAz = normalize(uSunDirection.xz);
        float towardSun = pow(max(0.0, dot(az, sunAz)), 2.4);
        float band = smoothstep(0.32, 0.03, elev) * smoothstep(-0.1, 0.05, elev);
        color = mix(color, uSunrise, towardSun * band * uSunriseStrength);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
}

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
  constructor({ scene, sea, hemi, sun, dock, crane, truck, traffic, bounds, worker }) {
    this.scene = scene;
    this.sea = sea;
    this.hemi = hemi;
    this.sun = sun;
    this.dock = dock;
    this.crane = crane;
    this.truck = truck;
    this.traffic = traffic;
    this.bounds = bounds;
    this.worker = worker;
    this.isNight = false;
    this.isSunrise = false;

    this.moon = new THREE.DirectionalLight(0xa8bdd8, 0.85);
    this.moon.name = 'Moon';
    this.moon.position.set(-40, 60, -30);
    this.moon.visible = false;
    this.scene.add(this.moon);

    this.skyMaterial = createSkyMaterial();
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(800, 32, 16),
      this.skyMaterial
    );
    this.sky.name = 'SkyDome';
    this.sky.renderOrder = -1000;
    this.scene.add(this.sky);

    this.setupSun();
    this.sea.castShadow = false;
    this.sea.receiveShadow = true;
    this.applyLook();
  }

  setupSun() {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.target.position.set(0, 2, 30);

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
    this.applyLook();
  }

  setSunrise(on) {
    this.isSunrise = on;
    if (!this.isNight) {
      this.applyLook();
    }
  }

  applyLook() {
    const look = this.isNight ? NIGHT : (this.isSunrise ? SUNRISE : NOON);

    this.hemi.color.set(look.hemiSky);
    this.hemi.groundColor.set(look.hemiGround);
    this.hemi.intensity = look.hemiIntensity;

    this.sun.visible = !this.isNight;
    this.moon.visible = this.isNight;

    if (!this.isNight) {
      this.sun.color.set(look.sunColor);
      this.sun.intensity = look.sunIntensity;
      this.sun.position.copy(look.sunPosition);
    }

    this.scene.background.set(look.background);

    this.skyMaterial.uniforms.uZenith.value.set(look.zenith);
    this.skyMaterial.uniforms.uMid.value.set(look.mid);
    this.skyMaterial.uniforms.uSunrise.value.set(look.glow);
    this.skyMaterial.uniforms.uHorizon.value.set(look.horizon);
    this.skyMaterial.uniforms.uSunriseStrength.value = look.sunriseStrength;
    this.skyMaterial.uniforms.uSunDirection.value
      .copy(this.isNight ? this.moon.position : this.sun.position)
      .normalize();

    if (!this.scene.fog) {
      this.scene.fog = new THREE.Fog(look.fog, 85, MAP_RADIUS + 180);
    } else {
      this.scene.fog.color.set(look.fog);
      this.scene.fog.near = 85;
      this.scene.fog.far = MAP_RADIUS + 180;
    }

    const lightPosition = this.isNight ? this.moon.position : this.sun.position;

    this.sea.material.uniforms.waterColor.value.set(look.waterColor);
    this.sea.material.uniforms.sunColor.value.set(look.waterSun);
    this.sea.material.uniforms.sunDirection.value
      .copy(lightPosition)
      .normalize();

    this.dock.setLampsOn(this.isNight);
    this.crane.setLightsOn(this.isNight);
    this.truck.setLightsOn(this.isNight);
    this.traffic?.setLightsOn(this.isNight);

    if (!this.isNight) {
      this.worker?.putAwayFlashlight();
    }
    this.bounds.setFogColor(look.fog);
  }
}
