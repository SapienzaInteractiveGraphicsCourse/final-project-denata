import * as THREE from 'three';

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 90, 50, 1)');
  grad.addColorStop(0.35, 'rgba(200, 12, 8, 0.95)');
  grad.addColorStop(1, 'rgba(120, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const mat = new THREE.PointsMaterial({
  size: 22,
  sizeAttenuation: false,
  map: glowTexture(),
  transparent: true,
  opacity: 0.85,
  depthTest: true,
  depthWrite: false,
  toneMapped: false,
  fog: false,
  visible: false
});

const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));

export function setBeaconsOn(on) {
  mat.visible = on;
}

export function pulseBeacons(time) {
  if (!mat.visible) {
    return;
  }

  mat.size = 20 + 4 * (Math.sin(time * 0.006) * 0.5 + 0.5);
}

export function addBeacon(parent, x, y, z) {
  const point = new THREE.Points(pointGeo, mat);
  point.position.set(x, y + 0.2, z);
  point.renderOrder = 20;
  parent.add(point);
  return point;
}

export function createBeacons(spots) {
  const pos = [];
  for (const p of spots) {
    pos.push(p[0], p[1] + 0.2, p[2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, mat);
  points.name = 'ObstructionBeacons';
  points.renderOrder = 20;
  return points;
}
