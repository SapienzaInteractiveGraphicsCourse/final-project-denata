import * as THREE from 'three';

export const MAP_CENTER = new THREE.Vector3(2.5, 2, 42);
export const MAP_RADIUS = 96;
export const FOG_NOON_COLOR = 0xc5d4e0;
export const FOG_SUNRISE_COLOR = 0x8e96a0;
export const FOG_NIGHT_COLOR = 0x2a3a52;
export const FOG_DAY_COLOR = FOG_NOON_COLOR;

const RING_Y = 2.08;
const FOG_HEIGHT = 40;
const FOG_SEGMENTS = 96;
const DAY_FOG = FOG_DAY_COLOR;
const WATER_PUSH = 50;

const FOG_LAYERS = [
  { extra: -28, opacity: 0.03, phase: 0.1 },
  { extra: -12, opacity: 0.05, phase: 0.4 },
  { extra: 4, opacity: 0.07, phase: 0.7 },
  { extra: 18, opacity: 0.1, phase: 1.0 },
  { extra: 32, opacity: 0.13, phase: 0.2 },
  { extra: 46, opacity: 0.16, phase: 0.55 },
  { extra: 60, opacity: 0.2, phase: 0.9 },
  { extra: 74, opacity: 0.25, phase: 1.25 },
  { extra: 88, opacity: 0.32, phase: 1.6 },
  { extra: 102, opacity: 0.4, phase: 1.95 }
];

const CHANNEL_DIR = new THREE.Vector2(10 - MAP_CENTER.x, -3 - MAP_CENTER.z).normalize();
const LEFT_SHIP_DIR = new THREE.Vector2(-80 - MAP_CENTER.x, -3 - MAP_CENTER.z).normalize();
const RIGHT_SHIP_DIR = new THREE.Vector2(105 - MAP_CENTER.x, -3 - MAP_CENTER.z).normalize();
const LEFT_TIP_DIR = new THREE.Vector2(-125 - MAP_CENTER.x, -3 - MAP_CENTER.z).normalize();
const RIGHT_TIP_DIR = new THREE.Vector2(155 - MAP_CENTER.x, -3 - MAP_CENTER.z).normalize();

function radiusAt(angle, extra = 0, phase = 0) {
  const towardWater = Math.max(0, -Math.sin(angle));

  return MAP_RADIUS
    + extra
    + WATER_PUSH * towardWater
    + 12 * Math.sin(angle * 2 + 0.4 + phase)
    + 8 * Math.sin(angle * 3 + 1.6 + phase * 1.3)
    + 5 * Math.sin(angle * 5 + 2.3 + phase * 0.6)
    + 3 * Math.sin(angle * 8 + 0.8 + phase * 1.8);
}

function createWallGeometry(extra, phase) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index <= FOG_SEGMENTS; index += 1) {
    const t = index / FOG_SEGMENTS;
    const angle = t * Math.PI * 2;
    const radius = radiusAt(angle, extra, phase);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positions.push(x, 0, z, x, FOG_HEIGHT, z);
    uvs.push(t, 0, t, 1);
  }

  for (let index = 0; index < FOG_SEGMENTS; index += 1) {
    const a = index * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFogMaterial(opacity) {
  const opaque = opacity >= 1;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(DAY_FOG) },
      uOpacity: { value: opacity },
      uCenter: { value: new THREE.Vector2(MAP_CENTER.x, MAP_CENTER.z) },
      uChannelDir: { value: CHANNEL_DIR.clone() },
      uLeftShipDir: { value: LEFT_SHIP_DIR.clone() },
      uRightShipDir: { value: RIGHT_SHIP_DIR.clone() },
      uLeftTipDir: { value: LEFT_TIP_DIR.clone() },
      uRightTipDir: { value: RIGHT_TIP_DIR.clone() }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform vec2 uCenter;
      uniform vec2 uChannelDir;
      uniform vec2 uLeftShipDir;
      uniform vec2 uRightShipDir;
      uniform vec2 uLeftTipDir;
      uniform vec2 uRightTipDir;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        float heightFade = smoothstep(0.0, 0.14, vUv.y)
          * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        float grain = fract(
          sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453
        );

        vec2 dir = normalize(vWorldPos.xz - uCenter);
        float waterClear = pow(max(0.0, dot(dir, uChannelDir)), 2.6);
        float sideFog = pow(max(0.0, dot(dir, uLeftShipDir)), 7.0)
          + pow(max(0.0, dot(dir, uRightShipDir)), 7.0)
          + 0.7 * pow(max(0.0, dot(dir, uLeftTipDir)), 10.0)
          + 0.7 * pow(max(0.0, dot(dir, uRightTipDir)), 10.0);

        float alpha = uOpacity * heightFade * (0.86 + 0.14 * grain);
        alpha *= mix(1.0, 0.12, waterClear);
        alpha *= 1.0 + 0.85 * min(sideFog, 1.0);

        if (alpha < 0.02) {
          discard;
        }

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: !opaque,
    depthWrite: opaque,
    side: THREE.DoubleSide,
    fog: false
  });
}

export class MapBounds {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'MapBounds';
    this.root.position.set(MAP_CENTER.x, 0, MAP_CENTER.z);
    this.fogMaterials = [];

    this.createRing();
    this.createFogWall();
    this.setFogColor(FOG_NOON_COLOR);
  }

  createRing() {
    const points = [];

    for (let index = 0; index <= FOG_SEGMENTS; index += 1) {
      const angle = (index / FOG_SEGMENTS) * Math.PI * 2;
      const radius = radiusAt(angle);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        RING_Y,
        Math.sin(angle) * radius
      ));
    }

    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xff3333 })
    );
    line.name = 'MapBoundRing';
    this.root.add(line);
  }

  createFogWall() {
    FOG_LAYERS.forEach((layer, index) => {
      const wall = new THREE.Mesh(
        createWallGeometry(layer.extra, layer.phase),
        createFogMaterial(layer.opacity)
      );
      wall.name = `MapFogLayer-${index + 1}`;
      wall.position.y = RING_Y;
      wall.renderOrder = index + 1;
      this.fogMaterials.push(wall.material);
      this.root.add(wall);
    });
  }

  setFogColor(color) {
    this.fogMaterials.forEach((material) => {
      material.uniforms.uColor.value.set(color);
    });
  }
}
