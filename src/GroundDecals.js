import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  ALL_DASH_ARCS,
  ALL_POINT_DECALS,
  DASHES,
  ROAD_EDGES,
  STOP_BARS,
  WEAR_DECALS,
  YARD_MARKINGS
} from './groundOccupancy.js';

export const DECAL_Y = 2.08;
export const DASH_Y = 2.075;
export const ASPHALT_TILE_METERS = 2.5;

const TEX = '/assets/textures/ground/';
const ASPHALT_URL = TEX + 'asphalt_tile.png';
const DASH_URL = TEX + 'dash_centerline_white.png';
const STRIPE_URL = TEX + 'paint_stripe_white.png';

const KIND_URLS = {
  manhole: TEX + 'decal_manhole.png',
  drain: TEX + 'decal_drain.png',
  patch: TEX + 'decal_patch.png',
  crack: TEX + 'decal_crack.png',
  stop: TEX + 'decal_stop.png',
  arrow: TEX + 'decal_arrow_white.png',
  letterD: TEX + 'decal_letter_d.png',
  letterY1: TEX + 'decal_letter_y1.png',
  letterY3: TEX + 'decal_letter_y3.png',
  letterY4: TEX + 'decal_letter_y4.png',
  letterY5: TEX + 'decal_letter_y5.png',
  dust: TEX + 'decal_dust.png',
  dustB: TEX + 'decal_dust_b.png',
  dirt: TEX + 'decal_dirt.png',
  dirtB: TEX + 'decal_dirt_b.png',
  pcrack: TEX + 'decal_pcrack.png',
  oil: TEX + 'decal_oil.png',
  fish: TEX + 'decal_fish.png',
  salt: TEX + 'decal_salt.png',
  net: TEX + 'decal_net.png'
};

const WEAR_LOOK = {
  dust: { tint: 0xb8ab98, alphaTest: 0.08, alphaGain: 1.12, roughness: 0.97, opacity: 0.34 },
  dustB: { tint: 0xc0b4a2, alphaTest: 0.08, alphaGain: 1.12, roughness: 0.97, opacity: 0.32 },
  dirt: { tint: 0xa89884, alphaTest: 0.08, alphaGain: 1.18, roughness: 0.97, opacity: 0.36 },
  dirtB: { tint: 0x9c8c78, alphaTest: 0.08, alphaGain: 1.18, roughness: 0.97, opacity: 0.34 },
  pcrack: { tint: 0x8a847c, alphaTest: 0.12, alphaGain: 1.55, roughness: 0.94, opacity: 0.72 },
  crack: { tint: 0x7a746c, alphaTest: 0.12, alphaGain: 1.6, roughness: 0.94, opacity: 0.7 },
  oil: { tint: 0x7a6a58, alphaTest: 0.1, alphaGain: 1.35, roughness: 0.62, opacity: 0.42 },
  fish: { tint: 0xe8e0d4, alphaTest: 0.1, alphaGain: 1.25, roughness: 0.92, opacity: 0.38 },
  salt: { tint: 0xf0ece4, alphaTest: 0.1, alphaGain: 1.18, roughness: 0.92, opacity: 0.32 },
  net: { tint: 0xc8c4b4, alphaTest: 0.1, alphaGain: 1.25, roughness: 0.92, opacity: 0.4 }
};

const DASH_LENGTH = 2.4;
const DASH_WIDTH = 0.18;
const SLOT_LINE = 0.14;
const OUTER_LINE = 0.18;
const EDGE_LINE = 0.18;
const SLOT_Y = 2.079;
const OUTER_Y = 2.0805;
const EDGE_Y = 2.077;
const WEAR_Y = 2.072;
const STRIPE_TILE = 2.4;
const ROAD_ARC = 8;
const ARC_EDGE_INNER = 5.32;
const ARC_EDGE_OUTER = 10.68;
const ARC_STEPS = 24;

const loader = new THREE.TextureLoader();

function prepareColorMap(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function flatQuat(rotationY = 0) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, rotationY, 0, 'YXZ')
  );
}

export function applyPlanarXzUvs(object, tileMeters = ASPHALT_TILE_METERS) {
  object.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    const geometry = child.geometry;
    const position = geometry.attributes.position;
    if (!geometry.attributes.uv) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2));
    }
    const uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      vertex.applyMatrix4(child.matrixWorld);
      uv.setXY(i, vertex.x / tileMeters, vertex.z / tileMeters);
    }
    uv.needsUpdate = true;
  });
}

export async function loadAsphaltMap() {
  const map = prepareColorMap(await loader.loadAsync(ASPHALT_URL));
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  return map;
}

function bakeWearAlpha(texture, alphaGain) {
  const image = texture.image;
  if (!image?.width) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const mag = Math.hypot(data[i], data[i + 1], data[i + 2]) / 441.67295593;
    data[i + 3] = Math.min(255, mag * alphaGain * 255);
  }
  ctx.putImageData(pixels, 0, 0);
  texture.image = canvas;
  texture.needsUpdate = true;
  return texture;
}

function wearMapFrom(source, alphaGain) {
  const map = source.clone();
  bakeWearAlpha(map, alphaGain);
  return map;
}

function paintMat(map, extra) {
  return new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    depthWrite: false,
    metalness: 0,
    polygonOffset: true,
    ...extra
  });
}

function addMerged(parent, geometries, material, name) {
  if (geometries.length === 0) return;
  const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
  if (!geometry) return;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  parent.add(mesh);
}

function planeGeo(width, depth, x, z, y, rotationY, tileUvs = false) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  if (tileUvs) {
    const uv = geometry.attributes.uv;
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      uv.setXY(i, (pos.getX(i) + width / 2) / STRIPE_TILE, (pos.getY(i) + depth / 2) / depth);
    }
    uv.needsUpdate = true;
  }
  geometry.applyQuaternion(flatQuat(rotationY));
  geometry.translate(x, y, z);
  return geometry;
}

function stripeGeo(x1, z1, x2, z2, thickness, y) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  if (length < 0.08) return null;
  return planeGeo(length, thickness, (x1 + x2) / 2, (z1 + z2) / 2, y, Math.atan2(-dz, dx), true);
}

function arcPoint(cx, cz, localAngle, radius, rotY) {
  const lx = Math.cos(localAngle) * radius;
  const lz = Math.sin(localAngle) * radius;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

function addStripe(geos, seen, x1, z1, x2, z2, thickness, y) {
  const vals = [x1, z1, x2, z2].map((v) => Math.round(v * 50) / 50);
  const key = (vals[0] > vals[2] || (vals[0] === vals[2] && vals[1] > vals[3]))
    ? `${vals[2]},${vals[3]}|${vals[0]},${vals[1]}`
    : `${vals[0]},${vals[1]}|${vals[2]},${vals[3]}`;
  if (seen.has(key)) return;
  const geo = stripeGeo(x1, z1, x2, z2, thickness, y);
  if (!geo) return;
  seen.add(key);
  geos.push(geo);
}

function addRect(geos, seen, rect, thickness, y) {
  const hw = rect.width / 2;
  const hd = rect.depth / 2;
  const L = rect.x - hw;
  const R = rect.x + hw;
  const S = rect.z - hd;
  const N = rect.z + hd;
  addStripe(geos, seen, L, S, R, S, thickness, y);
  addStripe(geos, seen, L, N, R, N, thickness, y);
  addStripe(geos, seen, L, S, L, N, thickness, y);
  addStripe(geos, seen, R, S, R, N, thickness, y);
}

function addArcEdge(geos, cx, cz, radius, rotY) {
  const start = -Math.PI / 2;
  let prev = arcPoint(cx, cz, start, radius, rotY);
  for (let i = 1; i <= ARC_STEPS; i += 1) {
    const next = arcPoint(cx, cz, start + (Math.PI / 2) * i / ARC_STEPS, radius, rotY);
    const geo = stripeGeo(prev.x, prev.z, next.x, next.z, EDGE_LINE, EDGE_Y);
    if (geo) geos.push(geo);
    prev = next;
  }
}

function addGroundPlane(parent, material, decal) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(decal.width, decal.depth), material);
  mesh.name = decal.name;
  mesh.position.set(decal.x, DECAL_Y, decal.z);
  mesh.quaternion.copy(flatQuat(decal.rotationY));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  parent.add(mesh);
}

export class GroundDecals {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'GroundDecals';
    this.loading = this.build();
  }

  async build() {
    const kinds = Object.entries(KIND_URLS);
    const [dashMap, stripeMap, ...kindMaps] = await Promise.all([
      loader.loadAsync(DASH_URL),
      loader.loadAsync(STRIPE_URL),
      ...kinds.map(([, url]) => loader.loadAsync(url))
    ]);

    prepareColorMap(dashMap);
    prepareColorMap(stripeMap);
    stripeMap.wrapS = THREE.RepeatWrapping;
    stripeMap.wrapT = THREE.ClampToEdgeWrapping;

    const maps = {};
    kinds.forEach(([kind], i) => {
      maps[kind] = prepareColorMap(kindMaps[i]);
    });

    const dashGeos = DASHES.map(([x, z, rot]) => (
      planeGeo(DASH_LENGTH, DASH_WIDTH, x, z, DASH_Y, rot)
    ));
    addMerged(this.root, dashGeos, paintMat(dashMap, {
      alphaTest: 0.18,
      roughness: 0.88,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    }), 'RoadDashes');

    const stripeGeos = [];
    const seen = new Set();
    YARD_MARKINGS.forEach((yard) => {
      yard.slots.forEach((slot) => addRect(stripeGeos, seen, slot, SLOT_LINE, SLOT_Y));
      addRect(stripeGeos, seen, yard.outer, OUTER_LINE, OUTER_Y);
      if (yard.letterBox) addRect(stripeGeos, seen, yard.letterBox, SLOT_LINE, OUTER_Y);
    });
    STOP_BARS.forEach((bar) => {
      stripeGeos.push(planeGeo(bar.width, bar.depth, bar.x, bar.z, OUTER_Y, bar.rotationY, true));
    });
    ROAD_EDGES.forEach(([x1, z1, x2, z2]) => {
      const geo = stripeGeo(x1, z1, x2, z2, EDGE_LINE, EDGE_Y);
      if (geo) stripeGeos.push(geo);
    });
    ALL_DASH_ARCS.forEach(({ x, z, rotationY }) => {
      addArcEdge(stripeGeos, x, z, ARC_EDGE_INNER, rotationY);
      addArcEdge(stripeGeos, x, z, ARC_EDGE_OUTER, rotationY);
    });
    addMerged(this.root, stripeGeos, paintMat(stripeMap, {
      alphaTest: 0.2,
      roughness: 0.88,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    }), 'GroundStripes');

    const wearByKind = {};
    Object.keys(WEAR_LOOK).forEach((kind) => {
      wearByKind[kind] = [];
    });
    WEAR_DECALS.forEach((d) => {
      if (!wearByKind[d.kind]) return;
      wearByKind[d.kind].push(planeGeo(d.width, d.depth, d.x, d.z, WEAR_Y, d.rotationY));
    });
    Object.entries(WEAR_LOOK).forEach(([kind, look]) => {
      addMerged(
        this.root,
        wearByKind[kind],
        paintMat(wearMapFrom(maps[kind], look.alphaGain), {
          color: look.tint,
          opacity: look.opacity,
          alphaTest: look.alphaTest,
          roughness: look.roughness,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        }),
        `Wear_${kind}`
      );
    });

    const materials = new Map();
    ALL_POINT_DECALS.forEach((decal) => {
      const key = `${decal.kind}:${decal.alphaTest}`;
      if (!materials.has(key)) {
        materials.set(key, paintMat(maps[decal.kind], {
          alphaTest: decal.alphaTest,
          roughness: 0.88,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2
        }));
      }
      addGroundPlane(this.root, materials.get(key), decal);
    });
  }
}
