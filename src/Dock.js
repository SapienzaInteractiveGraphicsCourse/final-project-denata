import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CargoSlots } from './CargoSlots.js';
import { CONTAINER_SIZE } from './ContainerManager.js';
import { enableShadows } from './Lighting.js';

const DEPOT_ORIGIN = { x: -10, y: 2, z: 42 };
const DEPOT_COL_SPACING = 3.2;
const DEPOT_ROW_SPACING = 8;
const DEPOT_COLS = 3;
const DEPOT_ROWS = 4;
const TALL_LAMP_NAME = '375770_Lampione_Lightstar_long';
const SHORT_LAMP_NAME = '375770_Lampione_Lightstar';
const TALL_LAMP_HEIGHT = 6.5;
const ROAD_LAMP_SPACING = 14;
const ROAD_LAMP_OFFSET = 4.6;
const LAMP_GROUND_Y = 2;
const ROAD_Y = 2.03;
const ROAD_THICKNESS = 0.06;
const ROAD_WIDTH = 6;

// Extra port roads. Truck loop stays as-is in createRoad.
const PORT_ROADS = [
  [-110, 20, -90, 20],
  [-104, 20, -80, 60],
  [-80, 20, -80, 110],
  [-56, 20, -56, 88],
  [-80, 88, -32, 88],
  [-80, 110, -32, 144],
  [28, 20, 80, 20],
  [40, 20, 40, 108],
  [64, 20, 64, 76],
  [40, 76, 64, 76],
  [88, 28, 88, 72],
  [88, 72, 112, 108],
  [-32, 102, 40, 126],
  [40, 108, 40, 126],
  [40, 126, 62, 150]
];

const CLEAR_ROADS = [
  ...PORT_ROADS,
  [-90, 20, -8, 20],
  [-32, 28, -32, 145],
  [0, 28, 0, 56],
  [-24, 64, -8, 64],
  [80, 20, 88, 28]
];

const ROAD_CLEAR = ROAD_WIDTH / 2 + CONTAINER_SIZE.z / 2 + 0.4;

const STATIC_YARDS = [
  { id: 'Y1', x: -71.5, z: 32, cols: 2, rows: 12, rotationY: Math.PI / 2 },
  { id: 'Y2', x: -47.5, z: 32, cols: 2, rows: 12, rotationY: Math.PI / 2 },
  { id: 'Y3', x: 48.5, z: 28, cols: 2, rows: 10, rotationY: Math.PI / 2 },
  { id: 'Y4', x: 72.5, z: 28, cols: 2, rows: 9, rotationY: Math.PI / 2 },
  { id: 'Y5', x: -71.5, z: 96, cols: 3, rows: 6, rotationY: Math.PI / 2 },
  { id: 'Y6', x: -16, z: 130, cols: 8, rows: 3, rotationY: 0 },
  { id: 'Y7', x: 50, z: 118, cols: 2, rows: 7, rotationY: Math.PI / 2 },
  { id: 'Y8', x: 106, z: 82, cols: 2, rows: 5, rotationY: Math.PI / 2 }
];

const STATIC_STACK_SIZES = [1, 2, 2, 2, 3, 3, 4];

function distToRoad(x, z, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lengthSq = dx * dx + dz * dz;
  const t = THREE.MathUtils.clamp(
    ((x - x1) * dx + (z - z1) * dz) / lengthSq,
    0,
    1
  );

  return Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
}

function tooCloseToRoad(x, z) {
  return CLEAR_ROADS.some(([x1, z1, x2, z2]) => (
    distToRoad(x, z, x1, z1, x2, z2) < ROAD_CLEAR
  ));
}

function addRoadRun(parent, material, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, ROAD_THICKNESS, ROAD_WIDTH),
    material
  );
  mesh.position.set((x1 + x2) / 2, ROAD_Y, (z1 + z2) / 2);
  mesh.rotation.y = Math.atan2(-dz, dx);
  parent.add(mesh);
}

function createDepotLayout() {
  const layout = [];
  let index = 1;
  const colOffset = (DEPOT_COLS - 1) / 2;
  const rowOffset = (DEPOT_ROWS - 1) / 2;

  for (let row = 0; row < DEPOT_ROWS; row += 1) {
    for (let col = 0; col < DEPOT_COLS; col += 1) {
      layout.push({
        id: `D${index}`,
        position: new THREE.Vector3(
          DEPOT_ORIGIN.x + (col - colOffset) * DEPOT_COL_SPACING,
          DEPOT_ORIGIN.y,
          DEPOT_ORIGIN.z + (row - rowOffset) * DEPOT_ROW_SPACING
        ),
        rotationY: 0
      });
      index += 1;
    }
  }

  return layout;
}

export class Dock {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Dock';

    this.createPlatform();
    this.createRoad();
    this.createRoadMarkings();
    this.createDepot();
    this.createStreetLamps();

    enableShadows(this.platform, false);
    enableShadows(this.road, false);
    enableShadows(this.roadMarkings, false);
  }

  createPlatform() {
    this.platform = new THREE.Mesh(
      new THREE.BoxGeometry(1200, 5, 600),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    this.platform.name = 'DockPlatform';
    this.platform.position.set(0, -0.5, 305);
    this.root.add(this.platform);
  }

  createQuarterTurn(innerRadius, outerRadius) {
    const shape = new THREE.Shape();

    shape.moveTo(0, outerRadius);
    shape.absarc(0, 0, outerRadius, Math.PI / 2, 0, true);
    shape.lineTo(innerRadius, 0);
    shape.absarc(0, 0, innerRadius, 0, Math.PI / 2, false);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: false,
      curveSegments: 24
    });

    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }

  createRoad() {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x30343b,
      roughness: 0.9
    });

    this.road = new THREE.Group();
    this.road.name = 'Road';

    const horizontalRoad = new THREE.Mesh(
      new THREE.BoxGeometry(50, 0.06, 6),
      roadMaterial
    );
    horizontalRoad.position.set(-65, 2.03, 20);
    this.road.add(horizontalRoad);

    const curvedRoad = new THREE.Mesh(
      this.createQuarterTurn(5, 11),
      roadMaterial
    );
    curvedRoad.position.set(-40, 2, 28);
    this.road.add(curvedRoad);

    const verticalRoad = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.06, 117),
      roadMaterial
    );
    verticalRoad.position.set(-32, 2.03, 86.5);
    this.road.add(verticalRoad);

    const topRoad = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.06, 6),
      roadMaterial
    );
    topRoad.position.set(-24, 2.03, 20);
    this.road.add(topRoad);

    const topRightTurn = new THREE.Mesh(
      this.createQuarterTurn(5, 11),
      roadMaterial
    );
    topRightTurn.position.set(-8, 2, 28);
    this.road.add(topRightTurn);

    const rightRoad = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.06, 28),
      roadMaterial
    );
    rightRoad.position.set(0, 2.03, 42);
    this.road.add(rightRoad);

    const bottomRightTurn = new THREE.Mesh(
      this.createQuarterTurn(5, 11),
      roadMaterial
    );
    bottomRightTurn.position.set(-8, 2, 56);
    bottomRightTurn.rotation.y = -Math.PI / 2;
    this.road.add(bottomRightTurn);

    const bottomRoad = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.06, 6),
      roadMaterial
    );
    bottomRoad.position.set(-16, 2.03, 64);
    this.road.add(bottomRoad);

    const bottomLeftTurn = new THREE.Mesh(
      this.createQuarterTurn(5, 11),
      roadMaterial
    );
    bottomLeftTurn.position.set(-24, 2, 72);
    bottomLeftTurn.rotation.y = Math.PI / 2;
    this.road.add(bottomLeftTurn);

    PORT_ROADS.forEach(([x1, z1, x2, z2]) => {
      addRoadRun(this.road, roadMaterial, x1, z1, x2, z2);
    });

    const eastTurn = new THREE.Mesh(
      this.createQuarterTurn(5, 11),
      roadMaterial
    );
    eastTurn.position.set(80, 2, 28);
    this.road.add(eastTurn);

    this.root.add(this.road);
  }

  createRoadMarkings() {
    this.roadMarkings = new THREE.Group();
    this.roadMarkings.name = 'RoadMarkings';

    const markingGeometry = new THREE.BoxGeometry(3, 0.02, 0.12);
    const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d35f });

    for (let x = -84; x <= -44; x += 8) {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(x, 2.07, 20);
      this.roadMarkings.add(marking);
    }

    for (let z = 34; z <= 142; z += 8) {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(-32, 2.07, z);
      marking.rotation.y = -Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    for (let index = 0; index <= 2; index += 1) {
      const angle = -Math.PI / 2 + (index / 2) * (Math.PI / 2);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(
        -40 + Math.cos(angle) * 8,
        2.07,
        28 + Math.sin(angle) * 8
      );
      marking.rotation.y = -angle - Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    for (let x = -36; x <= -12; x += 8) {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(x, 2.07, 20);
      this.roadMarkings.add(marking);
    }

    for (let index = 0; index <= 2; index += 1) {
      const angle = -Math.PI / 2 + (index / 2) * (Math.PI / 2);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(
        -8 + Math.cos(angle) * 8,
        2.07,
        28 + Math.sin(angle) * 8
      );
      marking.rotation.y = -angle - Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    for (let z = 30; z <= 54; z += 8) {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(0, 2.07, z);
      marking.rotation.y = -Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    for (let index = 0; index <= 2; index += 1) {
      const angle = (index / 2) * (Math.PI / 2);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(
        -8 + Math.cos(angle) * 8,
        2.07,
        56 + Math.sin(angle) * 8
      );
      marking.rotation.y = -angle - Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    for (let x = -20; x <= -12; x += 8) {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(x, 2.07, 64);
      this.roadMarkings.add(marking);
    }

    for (let index = 0; index <= 2; index += 1) {
      const angle = -Math.PI / 2 - (index / 2) * (Math.PI / 2);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(
        -24 + Math.cos(angle) * 8,
        2.07,
        72 + Math.sin(angle) * 8
      );
      marking.rotation.y = -angle + Math.PI / 2;
      this.roadMarkings.add(marking);
    }

    const addDash = (x, z, rotationY = 0) => {
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(x, 2.07, z);
      marking.rotation.y = rotationY;
      this.roadMarkings.add(marking);
    };

    PORT_ROADS.forEach(([x1, z1, x2, z2]) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const rotationY = Math.atan2(-dz, dx);

      for (let t = 6; t <= length - 4; t += 8) {
        addDash(
          x1 + (dx / length) * t,
          z1 + (dz / length) * t,
          rotationY
        );
      }
    });

    for (let index = 0; index <= 2; index += 1) {
      const angle = -Math.PI / 2 + (index / 2) * (Math.PI / 2);
      addDash(
        80 + Math.cos(angle) * 8,
        28 + Math.sin(angle) * 8,
        -angle - Math.PI / 2
      );
    }

    this.root.add(this.roadMarkings);
  }

  createDepot() {
    this.depotRoot = new THREE.Group();
    this.depotRoot.name = 'Depot';
    this.root.add(this.depotRoot);

    this.depotSlots = new CargoSlots(this.depotRoot, createDepotLayout(), 3);
  }

  fillStaticYards(containerManager) {
    this.staticYards = new THREE.Group();
    this.staticYards.name = 'StaticYards';
    this.root.add(this.staticYards);

    let index = 1;

    STATIC_YARDS.forEach((yard) => {
      const longAlongX = yard.rotationY !== 0;
      const stepX = (longAlongX ? CONTAINER_SIZE.z : CONTAINER_SIZE.x) + 0.4;
      const stepZ = (longAlongX ? CONTAINER_SIZE.x : CONTAINER_SIZE.z) + 0.4;

      for (let col = 0; col < yard.cols; col += 1) {
        for (let row = 0; row < yard.rows; row += 1) {
          if (Math.random() < 0.12) {
            continue;
          }

          const x = yard.x + col * stepX;
          const z = yard.z + row * stepZ;

          if (tooCloseToRoad(x, z)) {
            continue;
          }

          const levels = STATIC_STACK_SIZES[
            Math.floor(Math.random() * STATIC_STACK_SIZES.length)
          ];

          for (let level = 0; level < levels; level += 1) {
            const cargo = containerManager.createRandom();
            cargo.name = `StaticContainer-${yard.id}-${index}`;
            cargo.position.set(x, 2 + level * CONTAINER_SIZE.y, z);
            cargo.rotation.y = yard.rotationY;
            cargo.userData.staticYard = true;
            this.staticYards.add(cargo);
            index += 1;
          }
        }
      }
    });

    enableShadows(this.staticYards);
  }

  createStreetLamps() {
    this.streetLamps = new THREE.Group();
    this.streetLamps.name = 'StreetLamps';
    this.root.add(this.streetLamps);

    this.lampLights = [];
    this.lampGlassMaterials = new Set();
    this.lampsOn = false;

    const loader = new GLTFLoader();
    loader.load(
      '/assets/models/lamp.glb',
      (gltf) => {
        this.setupStreetLamps(gltf.scene);
      },
      undefined,
      (error) => {
        console.error('Error loading street lamps:', error);
      }
    );
  }

  setupStreetLamps(sourceScene) {
    this.tallLampTemplate = this.prepareLampTemplate(
      sourceScene,
      TALL_LAMP_NAME,
      SHORT_LAMP_NAME,
      TALL_LAMP_HEIGHT
    );
    this.collectGlassMaterials(this.tallLampTemplate);

    this.placeTallLampsAlong(-88, 20, -35, 20, 'both');
    this.placeTallLampsAlong(-30, 20, 10, 20, 'right');
    this.placeTallLampsAlong(0, 22, 0, 64, 'right');
    this.placeTallLampsAlong(11, 64, -32, 64, 'right');
    this.placeTallLampsAlong(-32, 72, -32, 140, 'both');
    this.placeTallLampsAlong(-32, 30, -32, 72, 'left');

    this.setLampsOn(this.lampsOn);
  }

  prepareLampTemplate(sourceScene, keepName, removeName, targetHeight) {
    const holder = new THREE.Group();
    const model = sourceScene.clone(true);
    model.getObjectByName(removeName)?.removeFromParent();
    holder.add(model);
    holder.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    holder.scale.setScalar(targetHeight / size.y);
    holder.updateMatrixWorld(true);

    box.setFromObject(holder);
    const center = box.getCenter(new THREE.Vector3());
    holder.position.set(-center.x, -box.min.y, -center.z);

    if (size.x > size.z) {
      holder.rotation.y = Math.PI / 2;
    }

    const template = new THREE.Group();
    template.add(holder);
    return template;
  }

  collectGlassMaterials(object) {
    object.traverse((child) => {
      if (!child.isMesh) {
        return;
      }
  
      const material = child.material;
      const isGlass = this.isGlassMesh(child.name) || this.isGlassMesh(material?.name);
  
      if (isGlass) {
        this.lampGlassMaterials.add(material);
      }
    });
  }
  
  isGlassMesh(name) {
    return Boolean(name) && name.toLowerCase().includes('glass');
  }

  placeTallLampsAlong(fromX, fromZ, toX, toZ, sides) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const length = Math.hypot(dx, dz);
    const ux = dx / length;
    const uz = dz / length;
    const leftX = -uz;
    const leftZ = ux;

    for (let distance = ROAD_LAMP_SPACING / 2; distance < length; distance += ROAD_LAMP_SPACING) {
      const x = fromX + ux * distance;
      const z = fromZ + uz * distance;

      if (sides === 'left' || sides === 'both') {
        this.placeLamp(
          this.tallLampTemplate,
          x + leftX * ROAD_LAMP_OFFSET,
          z + leftZ * ROAD_LAMP_OFFSET,
          -leftX,
          -leftZ
        );
      }

      if (sides === 'right' || sides === 'both') {
        this.placeLamp(
          this.tallLampTemplate,
          x - leftX * ROAD_LAMP_OFFSET,
          z - leftZ * ROAD_LAMP_OFFSET,
          leftX,
          leftZ
        );
      }
    }
  }

  placeLamp(template, x, z, faceX, faceZ) {
    const lamp = template.clone(true);
    lamp.position.set(x, LAMP_GROUND_Y, z);
    lamp.rotation.y = Math.atan2(faceX, faceZ);
    enableShadows(lamp);
    this.streetLamps.add(lamp);
    this.addLampLight(lamp);
  }

  addLampLight(lamp) {
    lamp.updateMatrixWorld(true);

    const glassCenter = new THREE.Vector3();
    let foundGlass = false;

    lamp.traverse((child) => {
      if (foundGlass || !child.isMesh || !this.isGlassMesh(child.name)) {
        return;
      }

      new THREE.Box3().setFromObject(child).getCenter(glassCenter);
      foundGlass = true;
    });

    if (!foundGlass) {
      const box = new THREE.Box3().setFromObject(lamp);
      box.getCenter(glassCenter);
      glassCenter.y = box.max.y - 0.35;
    }

    const light = new THREE.PointLight(0xffe2a8, 0, 16, 2);
    lamp.worldToLocal(glassCenter);
    light.position.copy(glassCenter);
    lamp.add(light);
    this.lampLights.push(light);
  }

  setLampsOn(on) {
    this.lampsOn = on;

    this.lampLights.forEach((light) => {
      light.intensity = on ? 12 : 0;
      light.visible = on;
    });

    this.lampGlassMaterials.forEach((material) => {
      material.emissive.set(on ? 0xffe8a0 : 0x000000);
      material.emissiveIntensity = on ? 1.4 : 0;
    });
  }
}
