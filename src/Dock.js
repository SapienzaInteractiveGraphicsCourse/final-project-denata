import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CargoSlots } from './CargoSlots.js';
import { CONTAINER_SIZE } from './ContainerManager.js';
import { enableShadows } from './Lighting.js';
import { GroundDecals, applyPlanarXzUvs, loadAsphaltMap } from './GroundDecals.js';

const DEPOT_ORIGIN = { x: -10, y: 2, z: 42 };
const DEPOT_COL_SPACING = 3.2;
const DEPOT_ROW_SPACING = 8;
const DEPOT_COLS = 3;
const DEPOT_ROWS = 4;
const TALL_LAMP_HEIGHT = 6.5;
const ROAD_LAMP_SPACING = 14;
const ROAD_LAMP_OFFSET = 4.6;
const LAMP_GROUND_Y = 2;
const ROAD_Y = 2.03;
const ROAD_THICKNESS = 0.06;
const ROAD_WIDTH = 6;
const ROAD_ARC = 8;
const ROAD_ARC_INNER = 5;
const ROAD_ARC_OUTER = 11;
const DOCK_WIDTH = 1200;
const DOCK_LENGTH = 600;
const DOCK_TEXTURE_SIZE = 6;
const DOCK_TEXTURE_DESATURATION = 0.65;
const DOCK_CONCRETE_DIFFUSE_URL =
  '/assets/textures/concrete/brushed_concrete_2_diff_2k.jpg';
const DOCK_CONCRETE_NORMAL_URL =
  '/assets/textures/concrete/brushed_concrete_2_nor_gl_2k.jpg';
const DOCK_CONCRETE_ROUGHNESS_URL =
  '/assets/textures/concrete/brushed_concrete_2_rough_2k.jpg';
const INDUSTRIAL_BUILDING_URL =
  '/assets/models/industrial_buildings_set_-_low_poly_models.glb';
const FORKLIFT_URL = '/assets/models/forklift_low_poly.glb';
const FORKLIFT = {
  position: new THREE.Vector3(15, 2, 60),
  width: 1.7,
  length: 3.5,
  rotationY: Math.PI / 4
};
const DEPOT_FORKLIFT = {
  position: new THREE.Vector3(56, 2, 70.5),
  width: 1.7,
  length: 3.5,
  rotationY: - Math.PI / 2
};
const FUEL_TRUCK_URL = '/assets/models/fuel_truck.glb';
const FUEL_TRUCK = {
  position: new THREE.Vector3(36, 2, 19),
  width: 3,
  length: 13,
  rotationY: Math.PI / 2
};
const DOCKS_BOLLARD_URL = '/assets/models/docks_bollard.glb';
const SHIP_BOLLARD_HEIGHT = 0.85;
const SHIP_BOLLARDS = [
  // Main cargo ship 
  { position: new THREE.Vector3(-10, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(10, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(30, 2, 7), rotationY: 0 },
  // Decorative ship on the west 
  { position: new THREE.Vector3(-110, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(-80, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(-50, 2, 7), rotationY: 0 },
  // Decorative ship on the east 
  { position: new THREE.Vector3(75, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(105, 2, 7), rotationY: 0 },
  { position: new THREE.Vector3(135, 2, 7), rotationY: 0 }
];
const DECORATIVE_WORKERS_URL = '/assets/models/workers.glb';
const DECORATIVE_WORKER_HEIGHT = 1.75;
const DECORATIVE_WORKERS = [
  // Toolbox worker — north wall of the warehouse
  {
    name: 'Group1',
    position: new THREE.Vector3(-20, 2, 34.5),
    rotationY: - Math.PI / 2
  },
  // Standing worker — in front of the ship bollard
  {
    name: 'Group2',
    position: new THREE.Vector3(9.5, 2, 7),
    rotationY: Math.PI / 2
  },
  // Standing worker — in front of the ship bollard (west)
  {
    name: 'Group2',
    position: new THREE.Vector3(-50.5, 2, 7),
    rotationY: Math.PI / 2
  },
  // Walking worker — in front of the cargo ship
  {
    name: 'Group14',
    position: new THREE.Vector3(0, 2, 12),
    rotationY: Math.PI / 2
  },
  // Walking worker — in front of the cargo ship
  {
    name: 'Group14',
    position: new THREE.Vector3(-14, 2, 13),
    rotationY: -Math.PI / 2
  },
  // Walking worker — beside the office trailer
  {
    name: 'Group14',
    position: new THREE.Vector3(-37, 2, 15),
    rotationY: Math.PI / 2
  },
  // Construction worker — portal crane pad
  {
    name: 'Group6',
    position: new THREE.Vector3(-51, 2, 28),
    rotationY: Math.PI / 2
  },
  // Drilling worker — portal crane pad
  {
    name: 'Group11',
    position: new THREE.Vector3(-49, 2, 27),
    rotationY: - Math.PI / 4
  },
  // Standing worker — portal crane pad
  {
    name: 'Group25',
    position: new THREE.Vector3(-49, 2, 29),
    rotationY:  - Math.PI + Math.PI / 4
  },
  // Walking worker — portal crane pad
  {
    name: 'Group14',
    position: new THREE.Vector3(-41, 2, 37),
    rotationY: Math.PI / 2
  },
  // Standing worker — yard between the water tower and warehouse
  {
    name: 'Group10',
    position: new THREE.Vector3(-27, 2, 33),
    rotationY: -Math.PI / 2
  },
  // Walking worker — central yard
  {
    name: 'Group14',
    position: new THREE.Vector3(-10, 2, 59),
    rotationY: Math.PI / 2
  },
  // Toolbox worker — corner of the office trailer
  {
    name: 'Group1',
    position: new THREE.Vector3(-27, 2, 15),
    rotationY: 0
  },
  // Walking worker — west container yard Y2
  {
    name: 'Group14',
    position: new THREE.Vector3(-68, 2, 26),
    rotationY: Math.PI / 2
  },
  // Toolbox worker — railroad loadbay shed
  {
    name: 'Group1',
    position: new THREE.Vector3(22, 2, 59),
    rotationY: Math.PI
  },
  // Walking worker — railroad loadbay shed
  {
    name: 'Group14',
    position: new THREE.Vector3(26, 2, 59),
    rotationY: 0
  },
  // Toolbox worker — on top of the storage tank
  {
    name: 'Group1',
    position: new THREE.Vector3(30, 8.1, 29),
    rotationY: Math.PI,
  },
  // Pole worker — on the storage tank
  {
    name: 'Group22',
    position: new THREE.Vector3(26, 2, 40.4),
    rotationY: Math.PI / 4,
    height: 6
  },
  // Seated worker — on the forklift
  {
    name: 'Group17',
    position: new THREE.Vector3(14.8, 2.65, 59.7),
    rotationY: Math.PI / 4
  },
  // Seated worker — depot forklift
  {
    name: 'Group17',
    position: new THREE.Vector3(56.5, 2.65, 70.5),
    rotationY: - Math.PI / 2
  },
  // Drilling worker — forklift area 
  {
    name: 'Group11',
    position: new THREE.Vector3(12, 2, 70),
    rotationY: Math.PI / 4
  },
  // Walking worker — forklift area 
  {
    name: 'Group14',
    position: new THREE.Vector3(11, 2, 63),
    rotationY: Math.PI 
  },
  // Standing worker — north container yard Y1
  {
    name: 'Group25',
    position: new THREE.Vector3(-74, 2, 28),
    rotationY: Math.PI / 2
  },
  // Walking worker — east container yard Y3
  {
    name: 'Group14',
    position: new THREE.Vector3(55, 2, 58),
    rotationY: -Math.PI / 2
  },
  // Toolbox worker — south of the fuel truck, off the road
  {
    name: 'Group1',
    position: new THREE.Vector3(41, 2, 16),
    rotationY: 0
  }
];
const DAMAGED_FENCE_URL = '/assets/models/damaged_chainlink_fence.glb';
const FENCE_SECTION_LENGTH = 3.5;
const FENCE_SECTION_HEIGHT = 2.8;
const FENCE_GAP = 0.1;
const FENCE_CORNER_CLEARANCE = 0.1;
const FENCE_END_CLEARANCE = 0.05;
const FENCE_VARIANT_PARTS = [
  ['Cylinder', 'Cube', 'Cylinder.001', 'Cylinder.002', 'Plane.001'],
  ['Cylinder.003', 'Cube.001', 'Cylinder.004', 'Cylinder.005', 'Plane.002'],
  ['Cylinder.006', 'Cube.002', 'Cylinder.007', 'Cylinder.008', 'Plane.003'],
  ['Cylinder.009', 'Cube.003', 'Cylinder.010', 'Cylinder.011', 'Plane.005'],
  ['Cylinder.012', 'Cube.004', 'Cylinder.013', 'Cylinder.014', 'Plane.006']
];
const FENCE_PATHS = [
  [
    [-8, 24.5],
    [-24, 24.5],
    [-26.5, 26],
    [-27.5, 29],
    [-27.5, 55],
    [-26.5, 58]
  ],
  [
    [-8, 59.5],
    [-5.5, 58],
    [-4.5, 55],
    [-4.5, 29]
  ],
  [
    [-17, 27],
    [-17, 58.5]
  ]
];
const OIL_BARRELS_URL = '/assets/models/oil_barrel_opt.glb';
const BARREL_HEIGHT = 0.9;
const BARREL_DIAMETER = 0.6;
const PLASTIC_WATER_CONTAINER_URL =
  '/assets/models/plastic_water_container_-_4mb.glb';
const PLASTIC_WATER_CONTAINER_HEIGHT = 1.25;
const PLASTIC_WATER_CONTAINER_ROTATIONS = [-0.2, 0.35, -0.45];
const PLASTIC_WATER_CONTAINER_POSITIONS = [
  new THREE.Vector3(14, 2, 68.5),
  new THREE.Vector3(17, 2, 71),
  new THREE.Vector3(13.5, 2, 72.5),
  new THREE.Vector3(48, 2, 71.5),
  new THREE.Vector3(52, 2, 70.5),
  new THREE.Vector3(49.6, 2, 69)
];
const INDUSTRIAL_BUILDING = {
  name: 'Industrial_Building_10',
  position: new THREE.Vector3(4, 2, 86),
  width: 24,
  length: 54,
  rotationY: Math.PI / 2
};
const RAILROAD_LOADBAY_SHED = {
  name: 'Industrial_Railroad_Loadbay_Shed_1',
  position: new THREE.Vector3(25, 2, 60),
  width: 8,
  length: 17,
  rotationY: 0
};
const INDUSTRIAL_WAREHOUSE = {
  name: 'Industrial_Warehouse_1',
  position: new THREE.Vector3(-23, 2, 48),
  width: 22,
  length: 7,
  rotationY: Math.PI / 2
};
const INDUSTRIAL_WATERTOWER = {
  name: 'Industrial_Watertower_1',
  position: new THREE.Vector3(-23, 2, 30),
  height: 10,
  rotationY: 0
};
const INDUSTRIAL_OFFICE_TRAILER = {
  name: 'Industrial_OfficeTrailer_1',
  position: new THREE.Vector3(-33, 2, 11),
  width: 10,
  length: 5,
  rotationY: 0
};
const INDUSTRIAL_POWERPLANT = {
  name: 'Industrial_Powerplant_1',
  position: new THREE.Vector3(-107, 2, 100),
  width: 45,
  length: 90,
  rotationY: Math.PI
};
const INDUSTRIAL_PORTAL_CRANE = {
  name: 'Industrial_PortalCrane_2',
  position: new THREE.Vector3(-45, 2, 42),
  width: 9,
  length: 14,
  rotationY: Math.PI / 2
};
const INDUSTRIAL_TANK_2_A = {
  name: 'Industrial_Tank_2',
  position: new THREE.Vector3(30, 2, 30),
  width: 10,
  length: 10,
  rotationY: 0
};
const INDUSTRIAL_TANK_2_B = {
  name: 'Industrial_Tank_2',
  position: new THREE.Vector3(30, 2, 44),
  width: 10,
  length: 10,
  rotationY: 0
};
const INDUSTRIAL_TANK_1_A = {
  name: 'Industrial_Tank_1',
  position: new THREE.Vector3(38, 2, 10),
  width: 8,
  length: 8,
  rotationY: 0
};
const INDUSTRIAL_TANK_1_B = {
  name: 'Industrial_Tank_1',
  position: new THREE.Vector3(48, 2, 10),
  width: 8,
  length: 8,
  rotationY: 0
};
const INDUSTRIAL_TANK_1_C = {
  name: 'Industrial_Tank_1',
  position: new THREE.Vector3(58, 2, 10),
  width: 8,
  length: 8,
  rotationY: 0
};
const INDUSTRIAL_TANK_4_A = {
  name: 'Industrial_Tank_4',
  position: new THREE.Vector3(33, 2, 14),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_TANK_4_B = {
  name: 'Industrial_Tank_4',
  position: new THREE.Vector3(43, 2, 14),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_TANK_4_C = {
  name: 'Industrial_Tank_4',
  position: new THREE.Vector3(53, 2, 14),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_SMTH = {
  name: 'Industrial_Smth_1',
  position: new THREE.Vector3(25, 2, 15),
  width: 7,
  length: 7,
  rotationY: Math.PI / 2
};
const INDUSTRIAL_TSR_STATION_A = {
  name: 'Industrial_TsrStation_1',
  position: new THREE.Vector3(23, 2, 21),
  width: 5,
  length: 2,
  rotationY: 0
};
const INDUSTRIAL_TSR_STATION_B = {
  name: 'Industrial_TsrStation_1',
  position: new THREE.Vector3(23, 2, 24),
  width: 5,
  length: 2,
  rotationY: 0
};
const INDUSTRIAL_RADIOTOWER_A = {
  name: 'Industrial_Radiotower_1',
  position: new THREE.Vector3(70, 2, 10),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_RADIOTOWER_B = {
  name: 'Industrial_Radiotower_1',
  position: new THREE.Vector3(-25, 2, 10),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_RADIOTOWER_C = {
  name: 'Industrial_Radiotower_1',
  position: new THREE.Vector3(-70, 2, 10),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_WAREHOUSE_3 = {
  name: 'Industrial_Warehouse_3',
  position: new THREE.Vector3(85, 2, 92),
  width: 16,
  length: 22,
  rotationY: Math.PI
};
const INDUSTRIAL_FACTORY_PLANT_2 = {
  name: 'Industrial_FactoryPlant_2',
  position: new THREE.Vector3(60, 2, 92),
  width: 18,
  length: 26,
  rotationY: -Math.PI / 2
};
const INDUSTRIAL_BUILDING_1_1 = {
  name: 'Industrial_Building_1',
  position: new THREE.Vector3(105, 2, 33),
  width: 18,
  length: 26,
  rotationY: 0
};
const INDUSTRIAL_BUILDING_1_2 = {
  name: 'Industrial_Building_1',
  position: new THREE.Vector3(105, 2, 63),
  width: 18,
  length: 26,
  rotationY: 0
};
const INDUSTRIAL_SILO_TANK_1_1 = {
  name: 'Industrial_SiloTank_1',
  position: new THREE.Vector3(75, 2, 70),
  width: 3,
  length: 3,
  rotationY: 0
};
const INDUSTRIAL_SILO_TANK_1_2 = {
  name: 'Industrial_SiloTank_1',
  position: new THREE.Vector3(80, 2, 70),
  width: 3,
  length: 3,
  rotationY: 0
};

// Extra port roads. Truck loop stays as-is in createRoad.
// Straights stop at quarter-turn tangents so L-corners fill like the truck loop.
const PORT_ROADS = [
  [-102, 20, -90, 20],
  [-110, 28, -110, 40],
  [-102, 48, -80, 48],
  [-80, 20, -80, 116],
  [-56, 20, -56, 88],
  [-80, 88, -32, 88],
  [-72, 124, -32, 124],
  [28, 20, 80, 20],
  [40, 20, 40, 150],
  [64, 20, 64, 76],
  [40, 64, 88, 64],
  [40, 76, 80, 76],
  [88, 28, 88, 68],
  [-32, 108, 40, 108]
];

const PORT_ARCS = [
  { x: -102, z: 28, rotationY: Math.PI / 2 },
  { x: -102, z: 40, rotationY: Math.PI },
  { x: -72, z: 116, rotationY: Math.PI },
  { x: 80, z: 28, rotationY: 0 },
  { x: 80, z: 68, rotationY: -Math.PI / 2 }
];

const CLEAR_ROADS = [
  ...PORT_ROADS,
  [-90, 20, -8, 20],
  [-32, 20, -32, 145],
  [0, 28, 0, 56],
  [-32, 64, -8, 64],
  [-102, 20, -110, 28],
  [-110, 40, -102, 48],
  [-80, 116, -72, 124],
  [80, 20, 88, 28],
  [80, 76, 88, 68]
];

const ROAD_CLEAR = ROAD_WIDTH / 2 + CONTAINER_SIZE.z / 2 + 0.4;

const STATIC_YARDS = [
  { id: 'Y1', x: -71.5, z: 32, cols: 2, rows: 12, rotationY: Math.PI / 2 },
  {
    id: 'Y2',
    x: -48.5
      + (CONTAINER_SIZE.z + 0.4) / 2
      - (CONTAINER_SIZE.x + 0.4),
    z: 45,
    cols: 3,
    rows: 8,
    maxLevels: 2,
    rotationY: 0
  },
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

function createFenceTypeSequence() {
  let state = 0x5f3759df;
  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const sequence = [];
  const proportionsPerTwenty = [14, 2, 1, 2, 1];

  for (let cycle = 0; cycle < 5; cycle += 1) {
    const group = [];
    proportionsPerTwenty.forEach((count, typeIndex) => {
      for (let index = 0; index < count; index += 1) {
        group.push(typeIndex);
      }
    });

    for (let index = group.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [group[index], group[swapIndex]] = [group[swapIndex], group[index]];
    }
    sequence.push(...group);
  }

  return sequence;
}

const FENCE_TYPE_SEQUENCE = createFenceTypeSequence();

function createSeededRandom(seed) {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function addDockTextureOrientationVariation(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>

      float dockTileHash(vec2 tile) {
        return fract(sin(dot(tile, vec2(127.1, 311.7))) * 43758.5453123);
      }

      vec2 rotateDockTileUv(vec2 uv, float quarterTurns) {
        vec2 tile = floor(uv);
        vec2 localUv = fract(uv);

        if (quarterTurns < 0.5) return tile + localUv;
        if (quarterTurns < 1.5) return tile + vec2(1.0 - localUv.y, localUv.x);
        if (quarterTurns < 2.5) return tile + vec2(1.0 - localUv.x, 1.0 - localUv.y);
        return tile + vec2(localUv.y, 1.0 - localUv.x);
      }

      vec3 orientedDockTileUv(vec2 uv) {
        float quarterTurns = floor(dockTileHash(floor(uv)) * 4.0);
        return vec3(rotateDockTileUv(uv, quarterTurns), quarterTurns);
      }

      vec2 rotateDockTileNormal(vec2 normalXY, float quarterTurns) {
        if (quarterTurns < 0.5) return normalXY;
        if (quarterTurns < 1.5) return vec2(normalXY.y, -normalXY.x);
        if (quarterTurns < 2.5) return -normalXY;
        return vec2(-normalXY.y, normalXY.x);
      }`
    );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP

          vec3 dockMapUv = orientedDockTileUv(vMapUv);
          vec4 sampledDiffuseColor = texture2D(map, dockMapUv.xy);

          #ifdef DECODE_VIDEO_TEXTURE
            sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
          #endif

          float dockConcreteGray = dot(
            sampledDiffuseColor.rgb,
            vec3(0.299, 0.587, 0.114)
          );
          sampledDiffuseColor.rgb = mix(
            sampledDiffuseColor.rgb,
            vec3(dockConcreteGray),
            ${DOCK_TEXTURE_DESATURATION.toFixed(2)}
          );
          sampledDiffuseColor.rgb *= vec3(0.94, 0.97, 1.0);
          diffuseColor *= sampledDiffuseColor;

        #endif`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness;

        #ifdef USE_ROUGHNESSMAP

          vec3 dockRoughnessUv = orientedDockTileUv(vRoughnessMapUv);
          vec4 texelRoughness = texture2D(roughnessMap, dockRoughnessUv.xy);
          roughnessFactor *= texelRoughness.g;

        #endif`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_NORMALMAP_OBJECTSPACE

          normal = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;

          #ifdef FLIP_SIDED
            normal = -normal;
          #endif

          #ifdef DOUBLE_SIDED
            normal = normal * faceDirection;
          #endif

          normal = normalize(normalMatrix * normal);

        #elif defined(USE_NORMALMAP_TANGENTSPACE)

          vec3 dockNormalUv = orientedDockTileUv(vNormalMapUv);
          vec3 mapN = texture2D(normalMap, dockNormalUv.xy).xyz * 2.0 - 1.0;

          #if defined(USE_PACKED_NORMALMAP)
            mapN = vec3(
              mapN.xy,
              sqrt(saturate(1.0 - dot(mapN.xy, mapN.xy)))
            );
          #endif

          mapN.xy = rotateDockTileNormal(mapN.xy, dockNormalUv.z);
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);

        #elif defined(USE_BUMPMAP)

          normal = perturbNormalArb(
            -vViewPosition,
            normal,
            dHdxy_fwd(),
            faceDirection
          );

        #endif`
      );
  };

  material.customProgramCacheKey = () => 'dock-tile-orientation-v2';
}

export class Dock {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Dock';

    const platformLoading = this.createPlatform();
    this.createRoad();
    this.createRoadMarkings();
    this.groundDecals = new GroundDecals();
    this.root.add(this.groundDecals.root);
    this.createDepot();
    this.loading = Promise.all([
      platformLoading,
      this.loadRoadAsphalt(),
      this.groundDecals.loading,
      this.createStreetLamps(),
      this.createIndustrialBuildings(),
      this.createForklift(),
      this.createFuelTruck(),
      this.createFences(),
      this.createOilBarrels(),
      this.createPlasticWaterContainers(),
      this.createShipBollards(),
      this.createDecorativeWorkers()
    ]);

    enableShadows(this.platform, false);
    enableShadows(this.road, false);
    enableShadows(this.roadMarkings, false);
    enableShadows(this.groundDecals.root, false);
  }

  createPlatform() {
    const concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.95
    });
    addDockTextureOrientationVariation(concreteMaterial);
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0,
      roughness: 0.95
    });

    this.platform = new THREE.Mesh(
      new THREE.BoxGeometry(DOCK_WIDTH, 5, DOCK_LENGTH),
      [
        sideMaterial,
        sideMaterial,
        concreteMaterial,
        sideMaterial,
        sideMaterial,
        sideMaterial
      ]
    );
    this.platform.name = 'DockPlatform';
    this.platform.position.set(0, -0.5, 305);
    this.root.add(this.platform);

    const loader = new THREE.TextureLoader();

    return Promise.all([
      loader.loadAsync(DOCK_CONCRETE_DIFFUSE_URL),
      loader.loadAsync(DOCK_CONCRETE_NORMAL_URL),
      loader.loadAsync(DOCK_CONCRETE_ROUGHNESS_URL)
    ]).then(([diffuse, normal, roughness]) => {
      [diffuse, normal, roughness].forEach((texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(
          DOCK_WIDTH / DOCK_TEXTURE_SIZE,
          DOCK_LENGTH / DOCK_TEXTURE_SIZE
        );
        texture.anisotropy = 8;
      });

      diffuse.colorSpace = THREE.SRGBColorSpace;
      concreteMaterial.map = diffuse;
      concreteMaterial.normalMap = normal;
      concreteMaterial.normalScale.set(0.55, 0.55);
      concreteMaterial.roughnessMap = roughness;
      concreteMaterial.needsUpdate = true;
    });
  }

  createQuarterTurn(innerRadius, outerRadius) {
    const shape = new THREE.Shape();

    shape.moveTo(0, outerRadius);
    shape.absarc(0, 0, outerRadius, Math.PI / 2, 0, true);
    shape.lineTo(innerRadius, 0);
    shape.absarc(0, 0, innerRadius, 0, Math.PI / 2, false);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: ROAD_THICKNESS,
      bevelEnabled: false,
      curveSegments: 24
    });

    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }

  addQuarterTurn(material, x, z, rotationY = 0) {
    const mesh = new THREE.Mesh(
      this.createQuarterTurn(ROAD_ARC_INNER, ROAD_ARC_OUTER),
      material
    );
    mesh.position.set(x, 2, z);
    mesh.rotation.y = rotationY;
    this.road.add(mesh);
  }

  async loadRoadAsphalt() {
    const map = await loadAsphaltMap();
    this.roadMaterial.map = map;
    this.roadMaterial.color.set(0xffffff);
    this.roadMaterial.needsUpdate = true;
  }

  createRoad() {
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x30343b,
      roughness: 0.92,
      metalness: 0
    });
    const roadMaterial = this.roadMaterial;

    this.road = new THREE.Group();
    this.road.name = 'Road';

    const horizontalRoad = new THREE.Mesh(
      new THREE.BoxGeometry(50, 0.06, 6),
      roadMaterial
    );
    horizontalRoad.position.set(-65, 2.03, 20);
    this.road.add(horizontalRoad);

    const verticalRoad = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.06, 125),
      roadMaterial
    );
    verticalRoad.position.set(-32, 2.03, 82.5);
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
      new THREE.BoxGeometry(24, 0.06, 6),
      roadMaterial
    );
    bottomRoad.position.set(-20, 2.03, 64);
    this.road.add(bottomRoad);

    PORT_ROADS.forEach(([x1, z1, x2, z2]) => {
      addRoadRun(this.road, roadMaterial, x1, z1, x2, z2);
    });

    PORT_ARCS.forEach(({ x, z, rotationY }) => {
      this.addQuarterTurn(roadMaterial, x, z, rotationY);
    });

    this.root.add(this.road);
    applyPlanarXzUvs(this.road);
  }

  createRoadMarkings() {
    this.roadMarkings = new THREE.Group();
    this.roadMarkings.name = 'RoadMarkings';
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

          const randomLevels = STATIC_STACK_SIZES[
            Math.floor(Math.random() * STATIC_STACK_SIZES.length)
          ];
          const levels = Math.min(
            randomLevels,
            yard.maxLevels ?? randomLevels
          );

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

  async createIndustrialBuildings() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(INDUSTRIAL_BUILDING_URL);

    this.industrialBuilding = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_BUILDING
    );
    this.railroadLoadbayShed = this.createIndustrialAsset(
      gltf.scene,
      RAILROAD_LOADBAY_SHED
    );
    this.industrialWarehouse = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_WAREHOUSE
    );
    this.industrialWatertower = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_WATERTOWER
    );
    this.industrialOfficeTrailer = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_OFFICE_TRAILER
    );
    this.industrialPowerplant = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_POWERPLANT
    );
    this.industrialPortalCrane = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_PORTAL_CRANE
    );
    this.industrialTank2A = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_2_A
    );
    this.industrialTank2B = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_2_B
    );
    this.industrialTank1A = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_1_A
    );
    this.industrialTank1B = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_1_B
    );
    this.industrialTank1C = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_1_C
    );
    this.industrialTank4A = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_4_A
    );
    this.industrialTank4B = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_4_B
    );
    this.industrialTank4C = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TANK_4_C
    );
    this.industrialSmth = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_SMTH
    );
    this.industrialTsrStationA = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TSR_STATION_A
    );
    this.industrialTsrStationB = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_TSR_STATION_B
    );
    this.industrialRadiotowerA = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_RADIOTOWER_A
    );
    this.industrialRadiotowerB = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_RADIOTOWER_B
    );
    this.industrialRadiotowerC = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_RADIOTOWER_C
    );
    this.industrialWarehouse3 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_WAREHOUSE_3
    );
    this.industrialFactoryPlant2 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_FACTORY_PLANT_2
    );
    this.industrialBuilding1_1 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_BUILDING_1_1
    );
    this.industrialBuilding1_2 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_BUILDING_1_2
    );
    this.industrialSiloTank1_1 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_SILO_TANK_1_1
    );
    this.industrialSiloTank1_2 = this.createIndustrialAsset(
      gltf.scene,
      INDUSTRIAL_SILO_TANK_1_2
    );

  }

  async createForklift() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(FORKLIFT_URL);

    this.forklift = this.createAsset(gltf.scene, FORKLIFT, 'Forklift');
    this.depotForklift = this.createAsset(gltf.scene, DEPOT_FORKLIFT, 'DepotForklift');
  }

  async createFuelTruck() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(FUEL_TRUCK_URL);

    this.fuelTruck = this.createAsset(gltf.scene, FUEL_TRUCK, 'FuelTruck');
  }

  async createShipBollards() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(DOCKS_BOLLARD_URL);
    const template = gltf.scene.children[0].children[0];

    this.shipBollards = new THREE.Group();
    this.shipBollards.name = 'ShipBollards';
    this.root.add(this.shipBollards);

    SHIP_BOLLARDS.forEach((config, index) => {
      const model = template.clone(true);
      model.rotation.x = Math.PI;
      model.rotation.y = Math.PI / 2;

      this.createAsset(
        model,
        {
          position: config.position,
          rotationY: config.rotationY,
          height: SHIP_BOLLARD_HEIGHT
        },
        `ShipBollard-${index + 1}`,
        this.shipBollards
      );
    });
  }

  async createDecorativeWorkers() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(DECORATIVE_WORKERS_URL);
    const pack = gltf.scene.getObjectByName('Model') || gltf.scene;

    this.decorativeWorkers = new THREE.Group();
    this.decorativeWorkers.name = 'DecorativeWorkers';
    this.root.add(this.decorativeWorkers);

    DECORATIVE_WORKERS.forEach((config, index) => {
      const source = pack.getObjectByName(config.name);

      this.createAsset(
        source,
        {
          position: config.position,
          rotationY: config.rotationY,
          height: config.height ?? DECORATIVE_WORKER_HEIGHT
        },
        `DecorativeWorker-${index + 1}`,
        this.decorativeWorkers
      );
    });
  }

  async createOilBarrels() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(OIL_BARRELS_URL);

    let sourceRoot = gltf.scene;
    while (
      sourceRoot.children.length === 1
      && !sourceRoot.children[0].isMesh
    ) {
      sourceRoot = sourceRoot.children[0];
    }

    gltf.scene.updateMatrixWorld(true);
    const variants = sourceRoot.children.filter((child) => {
      let containsMesh = false;
      child.traverse((descendant) => {
        containsMesh ||= descendant.isMesh;
      });
      return containsMesh;
    });

    if (!variants.length) {
      throw new Error('No barrel variants were found in the oil barrels GLB');
    }
    const placements = this.createOilBarrelPlacements(variants.length);
    const placementsByType = variants.map(() => []);

    placements.forEach((placement) => {
      placementsByType[placement.typeIndex].push(placement);
    });

    this.oilBarrels = new THREE.Group();
    this.oilBarrels.name = 'OilBarrels';

    variants.forEach((source, typeIndex) => {
      const typePlacements = placementsByType[typeIndex];
      if (!typePlacements.length) return;

      const template = this.preparePropTemplate(source, BARREL_HEIGHT, true);

      template.meshes.forEach((meshData, meshIndex) => {
        const instances = new THREE.InstancedMesh(
          meshData.geometry,
          meshData.material,
          typePlacements.length
        );
        instances.name = `OilBarrel_${typeIndex + 1}_${meshIndex + 1}`;
        instances.castShadow = false;
        instances.receiveShadow = true;

        typePlacements.forEach((placement, instanceIndex) => {
          const rotation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              placement.fallen ? Math.PI / 2 : 0,
              placement.rotationY,
              placement.fallen ? placement.roll : 0,
              'YXZ'
            )
          );
          const placementMatrix = new THREE.Matrix4().compose(
            new THREE.Vector3(placement.x, placement.y, placement.z),
            rotation,
            new THREE.Vector3(1, 1, 1)
          );
          const instanceMatrix = placementMatrix
            .multiply(template.normalizationMatrix)
            .multiply(meshData.worldMatrix);
          instances.setMatrixAt(instanceIndex, instanceMatrix);
        });

        instances.instanceMatrix.needsUpdate = true;
        instances.computeBoundingBox();
        instances.computeBoundingSphere();
        this.oilBarrels.add(instances);
      });
    });

    this.root.add(this.oilBarrels);
  }

  createOilBarrelPlacements(typeCount) {
    const random = createSeededRandom(0x0b411e15);
    const placements = [];
    const addBarrel = (x, y, z, fallen = false, forcedTypeIndex = null) => {
      const rotationY = random() * Math.PI * 2;
      const roll = (random() - 0.5) * 0.24;
      const randomTypeIndex = Math.floor(random() * typeCount);
      placements.push({
        x,
        y,
        z,
        fallen,
        rotationY,
        roll,
        typeIndex: forcedTypeIndex ?? randomTypeIndex
      });
    };

    const shedVariantOrder = [0, 1, 2, 3, 5, 6, 4, 7]
      .filter((typeIndex) => typeIndex < typeCount);
    let shedVariantIndex = 0;
    const nextShedVariant = () => {
      const typeIndex = shedVariantOrder[shedVariantIndex % shedVariantOrder.length];
      shedVariantIndex += 1;
      return typeIndex;
    };

    const irregularOffsets = [
      [0, 0],
      [0.72, 0.08],
      [-0.66, 0.15],
      [0.16, 0.68],
      [-0.22, -0.66],
      [0.7, 0.72],
      [-0.7, -0.58]
    ];

    // Three compact, irregular groups in the part of the shed facing the crane.
    // extraLevels controls the barrels stacked above each barrel on the ground.
    const shedGroups = [
      { x: 22.1, z: 52.8, count: 7, extraLevels: [2, 1, 0, 0, 0, 0, 0] },
      { x: 24.7, z: 54.7, count: 6, extraLevels: [1, 1, 1, 0, 0, 0] },
      { x: 22.2, z: 57.3, count: 6, extraLevels: [1, 1, 0, 0, 0, 0] }
    ];

    shedGroups.forEach((group) => {
      for (let index = 0; index < group.count; index += 1) {
        const [offsetX, offsetZ] = irregularOffsets[index];
        const x = group.x + offsetX + (random() - 0.5) * 0.1;
        const z = group.z + offsetZ + (random() - 0.5) * 0.1;
        addBarrel(x, 2 + BARREL_HEIGHT / 2, z, false, nextShedVariant());

        for (let level = 1; level <= group.extraLevels[index]; level += 1) {
          addBarrel(
            x,
            2 + BARREL_HEIGHT * (level + 0.5),
            z,
            false,
            nextShedVariant()
          );
        }
      }
    });

    // Fallen barrels stay away from the three upright groups and from each other.
    addBarrel(
      22,
      2 + BARREL_DIAMETER / 2,
      62.4,
      true,
      nextShedVariant()
    );
    addBarrel(
      27.2,
      2 + BARREL_DIAMETER / 2,
      64.6,
      true,
      nextShedVariant()
    );
    addBarrel(
      22.1,
      2 + BARREL_DIAMETER / 2,
      67.1,
      true,
      nextShedVariant()
    );

    // A single compact, irregular group in the external green area.
    const externalOffsets = [
      [0, 0],
      [0.7, 0.08],
      [-0.65, 0.13],
      [0.12, 0.66],
      [-0.16, -0.65],
      [0.66, 0.7],
      [-0.68, -0.58],
      [0.88, -0.5]
    ];
    externalOffsets.forEach(([offsetX, offsetZ]) => {
      addBarrel(
        20.2 + offsetX + (random() - 0.5) * 0.08,
        2 + BARREL_HEIGHT / 2,
        70.9 + offsetZ + (random() - 0.5) * 0.08
      );
    });

    // The two external fallen barrels are isolated from the upright group.
    addBarrel(24.3, 2 + BARREL_DIAMETER / 2, 69.5, true);
    addBarrel(25.2, 2 + BARREL_DIAMETER / 2, 72.8, true);

    // Compact group beside the water tower: six bases, two stacked and two fallen.
    const watertowerBarrels = [
      [-19.4, 31.8],
      [-18.7, 31.9],
      [-20.05, 32.15],
      [-19.25, 32.55],
      [-18.5, 32.65],
      [-19.85, 33]
    ];
    watertowerBarrels.forEach(([x, z]) => {
      addBarrel(x, 2 + BARREL_HEIGHT / 2, z);
    });
    addBarrel(-19.4, 2 + BARREL_HEIGHT * 1.5, 31.8);
    addBarrel(-18.5, 2 + BARREL_HEIGHT * 1.5, 32.65);
    addBarrel(-17.9, 2 + BARREL_DIAMETER / 2, 30.5, true);
    addBarrel(-20.7, 2 + BARREL_DIAMETER / 2, 34.1, true);

    // Three-barrel pyramid in the small space on the right.
    addBarrel(-6.75, 2 + BARREL_HEIGHT / 2, 25.75);
    addBarrel(-6.15, 2 + BARREL_HEIGHT / 2, 25.75);
    addBarrel(-6.45, 2 + BARREL_HEIGHT * 1.5, 25.75);

    return placements;
  }

  async createPlasticWaterContainers() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(PLASTIC_WATER_CONTAINER_URL);
    const sourceRoot = gltf.scene.getObjectByName('RootNode');

    if (!sourceRoot) {
      throw new Error('RootNode was not found in the plastic water container GLB');
    }

    gltf.scene.updateMatrixWorld(true);
    this.plasticWaterContainers = new THREE.Group();
    this.plasticWaterContainers.name = 'PlasticWaterContainers';

    PLASTIC_WATER_CONTAINER_POSITIONS.forEach((position, index) => {
      const source = sourceRoot.children[index % sourceRoot.children.length];
      const template = this.preparePropTemplate(
        source,
        PLASTIC_WATER_CONTAINER_HEIGHT,
        false
      );

      template.meshes.forEach((meshData, meshIndex) => {
        const instance = new THREE.InstancedMesh(
          meshData.geometry,
          meshData.material,
          1
        );
        instance.name = `PlasticWaterContainer_${index + 1}_${meshIndex + 1}`;
        instance.castShadow = false;
        instance.receiveShadow = true;

        const placementMatrix = new THREE.Matrix4().makeRotationY(
          PLASTIC_WATER_CONTAINER_ROTATIONS[index % PLASTIC_WATER_CONTAINER_ROTATIONS.length]
        );
        placementMatrix.setPosition(position);
        instance.setMatrixAt(
          0,
          placementMatrix
            .multiply(template.normalizationMatrix)
            .multiply(meshData.worldMatrix)
        );
        instance.instanceMatrix.needsUpdate = true;
        instance.computeBoundingBox();
        instance.computeBoundingSphere();
        this.plasticWaterContainers.add(instance);
      });
    });

    this.root.add(this.plasticWaterContainers);
  }

  preparePropTemplate(source, targetHeight, centerVertically) {
    const meshes = [];
    const box = new THREE.Box3();

    source.traverse((child) => {
      if (!child.isMesh) return;

      child.geometry.computeBoundingBox();
      const worldMatrix = child.matrixWorld.clone();
      box.union(
        child.geometry.boundingBox.clone().applyMatrix4(worldMatrix)
      );
      meshes.push({
        geometry: child.geometry,
        material: child.material,
        worldMatrix
      });
    });

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const moveToOrigin = new THREE.Matrix4().makeTranslation(
      -center.x,
      centerVertically ? -center.y : -box.min.y,
      -center.z
    );
    const uniformScale = targetHeight / size.y;
    const resize = new THREE.Matrix4().makeScale(
      uniformScale,
      uniformScale,
      uniformScale
    );

    return {
      meshes,
      normalizationMatrix: resize.multiply(moveToOrigin)
    };
  }

  async createFences() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(DAMAGED_FENCE_URL);
    const sourceRoot = gltf.scene.getObjectByName('RootNode');

    if (!sourceRoot) {
      throw new Error('RootNode was not found in damaged_chainlink_fence.glb');
    }

    gltf.scene.updateMatrixWorld(true);
    const placements = this.createFencePlacements();
    const placementsByType = FENCE_VARIANT_PARTS.map(() => []);

    placements.forEach((placement, index) => {
      const typeIndex = FENCE_TYPE_SEQUENCE[index % FENCE_TYPE_SEQUENCE.length];
      placementsByType[typeIndex].push(placement);
    });

    this.fences = new THREE.Group();
    this.fences.name = 'DamagedChainlinkFences';

    FENCE_VARIANT_PARTS.forEach((partNames, typeIndex) => {
      const typePlacements = placementsByType[typeIndex];
      if (!typePlacements.length) return;

      const template = this.prepareFenceTemplate(sourceRoot, partNames);

      template.meshes.forEach((meshData, meshIndex) => {
        const instances = new THREE.InstancedMesh(
          meshData.geometry,
          meshData.material,
          typePlacements.length
        );
        instances.name = `Damaged_Chainlink_Fence_${typeIndex + 1}_${meshIndex + 1}`;
        instances.castShadow = false;
        instances.receiveShadow = true;

        typePlacements.forEach((placement, instanceIndex) => {
          const placementMatrix = new THREE.Matrix4().makeRotationY(
            placement.rotationY
          );
          placementMatrix.setPosition(placement.x, 2, placement.z);
          placementMatrix.scale(
            new THREE.Vector3(1, 1, placement.length / FENCE_SECTION_LENGTH)
          );

          const instanceMatrix = placementMatrix
            .clone()
            .multiply(template.normalizationMatrix)
            .multiply(meshData.worldMatrix);
          instances.setMatrixAt(instanceIndex, instanceMatrix);
        });

        instances.instanceMatrix.needsUpdate = true;
        instances.computeBoundingBox();
        instances.computeBoundingSphere();
        this.fences.add(instances);
      });
    });

    this.root.add(this.fences);
  }

  createFencePlacements() {
    const placements = [];

    FENCE_PATHS.forEach((points) => {
      for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
        const [x1, z1] = points[segmentIndex];
        const [x2, z2] = points[segmentIndex + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const segmentLength = Math.hypot(dx, dz);
        const startClearance = segmentIndex === 0
          ? FENCE_END_CLEARANCE
          : FENCE_CORNER_CLEARANCE;
        const endClearance = segmentIndex === points.length - 2
          ? FENCE_END_CLEARANCE
          : FENCE_CORNER_CLEARANCE;
        const usableLength = segmentLength - startClearance - endClearance;
        const count = Math.max(
          1,
          Math.round(
            (usableLength + FENCE_GAP)
            / (FENCE_SECTION_LENGTH + FENCE_GAP)
          )
        );

        const sectionLength = (
          usableLength - (count - 1) * FENCE_GAP
        ) / count;
        const unitX = dx / segmentLength;
        const unitZ = dz / segmentLength;

        for (let index = 0; index < count; index += 1) {
          const distance = startClearance
            + sectionLength / 2
            + index * (sectionLength + FENCE_GAP);

          placements.push({
            x: x1 + unitX * distance,
            z: z1 + unitZ * distance,
            length: sectionLength,
            rotationY: Math.atan2(unitX, unitZ)
          });
        }
      }
    });

    return placements;
  }

  prepareFenceTemplate(sourceRoot, partNames) {
    const meshes = [];
    const box = new THREE.Box3();
    const normalizedName = (name) => name.replaceAll('.', '');

    partNames.forEach((partName) => {
      const part = sourceRoot.children.find(child => (
        normalizedName(child.name) === normalizedName(partName)
      ));
      const affectsTemplateBounds = !partName.startsWith('Plane');

      if (!part) {
        throw new Error(`${partName} was not found in damaged_chainlink_fence.glb`);
      }

      part.traverse((child) => {
        if (!child.isMesh) return;

        child.geometry.computeBoundingBox();
        const worldMatrix = child.matrixWorld.clone();
        const worldBox = child.geometry.boundingBox
          .clone()
          .applyMatrix4(worldMatrix);
        if (affectsTemplateBounds) {
          box.union(worldBox);
        }
        meshes.push({
          geometry: child.geometry,
          material: child.material,
          worldMatrix
        });
      });
    });

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const centerOnGround = new THREE.Matrix4().makeTranslation(
      -center.x,
      -box.min.y,
      -center.z
    );
    const resize = new THREE.Matrix4().makeScale(
      FENCE_SECTION_HEIGHT / size.y,
      FENCE_SECTION_HEIGHT / size.y,
      FENCE_SECTION_LENGTH / size.z
    );

    return {
      meshes,
      normalizationMatrix: resize.multiply(centerOnGround)
    };
  }

  createIndustrialAsset(sourceScene, config) {
    const source = sourceScene.getObjectByName(config.name);

    if (!source) {
      throw new Error(`${config.name} was not found in the industrial GLB`);
    }

    return this.createAsset(source, config, config.name);
  }

  createAsset(source, config, name, parent = this.root) {
    const model = source.clone(true);
    model.position.set(0, 0, 0);

    const offsetRoot = new THREE.Group();
    offsetRoot.add(model);
    offsetRoot.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(offsetRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    offsetRoot.position.set(-center.x, -box.min.y, -center.z);

    let widthScale;
    let lengthScale;
    let heightScale;

    if (config.height !== undefined) {
      heightScale = config.height / size.y;
      widthScale = heightScale;
      lengthScale = heightScale;
    } else {
      widthScale = config.width / size.x;
      lengthScale = config.length / size.z;
      heightScale = Math.sqrt(widthScale * lengthScale);
    }
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.set(widthScale, heightScale, lengthScale);
    scaleRoot.add(offsetRoot);

    const asset = new THREE.Group();
    asset.name = name;
    asset.position.copy(config.position);
    asset.rotation.y = config.rotationY;
    asset.add(scaleRoot);
    parent.add(asset);

    enableShadows(asset);
    return asset;
  }

  async createStreetLamps() {
    this.streetLamps = new THREE.Group();
    this.streetLamps.name = 'StreetLamps';
    this.root.add(this.streetLamps);

    this.fakeLampPositions = [];
    this.fakeLampLighting = null;
    this.lampGlassMaterials = new Set();
    this.lampsOn = false;

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/assets/models/street_lamp.glb');
    this.setupStreetLamps(gltf.scene);
  }

  setupStreetLamps(sourceScene) {
    this.tallLampTemplate = this.prepareLampTemplate(
      sourceScene,
      TALL_LAMP_HEIGHT
    );
    this.collectGlassMaterials(this.tallLampTemplate);

    this.placeTallLampsAlong(-88, 20, -35, 20, 'both');
    this.placeTopRoadLamps();
    this.placeTallLampsAlong(0, 22, 0, 64, 'right');
    this.placeBottomCurveLamps();
    this.placeTallLampsAlong(-32, 72, -32, 140, 'both');
    this.placeTallLampsAlong(-32, 30, -32, 72, 'left');

    this.createFakeLampLighting();
    this.setLampsOn(this.lampsOn);
  }

  placeTopRoadLamps() {
    // Keep the first two lamps in their original positions.
    [-23, -9].forEach((x) => {
      this.placeLamp(
        this.tallLampTemplate,
        x,
        20 - ROAD_LAMP_OFFSET,
        0,
        1
      );
    });

    // Move the third lamp beside the outside of the upper-right bend.
    // The pole has the standard road offset and faces the road at 45 degrees.
    const diagonal = Math.SQRT1_2;
    const curveAxisOffset = (8 + ROAD_LAMP_OFFSET) * diagonal;

    this.placeLamp(
      this.tallLampTemplate,
      -8 + curveAxisOffset,
      28 - curveAxisOffset,
      -diagonal,
      diagonal
    );
  }

  placeBottomCurveLamps() {
    const diagonal = Math.SQRT1_2;

    // Outside edge of the curve from the right vertical road to the
    // horizontal road. The arm points 45 degrees toward the bend.
    this.placeLamp(
      this.tallLampTemplate,
      0.8,
      64.8,
      -diagonal,
      -diagonal
    );

    // Lamp along the straight section between the two bends.
    this.placeLamp(this.tallLampTemplate, -10, 68.6, 0, -1);

    // Inside of the curve from the horizontal road to the left vertical
    // road. Keep the standard road offset and point 45 degrees at the road.
    const innerCurveAxisOffset = (8 - ROAD_LAMP_OFFSET) * diagonal;

    this.placeLamp(
      this.tallLampTemplate,
      -24 - innerCurveAxisOffset,
      72 - innerCurveAxisOffset,
      -diagonal,
      -diagonal
    );
  }

  prepareLampTemplate(sourceScene, targetHeight) {
    const holder = new THREE.Group();
    const model = sourceScene.clone(true);
    holder.add(model);
    holder.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    holder.scale.setScalar(targetHeight / size.y);
    // The downloaded model's arm points toward local -X. Rotate it so the
    // lamp's forward direction is local +Z, which placeLamp aims at the road.
    holder.rotation.y = Math.PI / 2;
    holder.updateMatrixWorld(true);

    box.setFromObject(holder);
    holder.position.y = -box.min.y;

    const template = new THREE.Group();
    template.add(holder);
    return template;
  }

  collectGlassMaterials(object) {
    object.traverse((child) => {
      if (!child.isMesh || !this.isGlassObject(child)) {
        return;
      }

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.filter(Boolean).forEach((material) => {
        this.lampGlassMaterials.add(material);
      });
    });
  }

  isGlassMesh(name) {
    return Boolean(name) && name.toLowerCase().includes('glass');
  }

  isGlassObject(object) {
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (materials.some((material) => this.isGlassMesh(material?.name))) {
      return true;
    }

    let current = object;

    while (current) {
      if (this.isGlassMesh(current.name)) {
        return true;
      }

      current = current.parent;
    }

    return false;
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
    this.collectFakeLampPosition(lamp);
  }

  collectFakeLampPosition(lamp) {
    lamp.updateMatrixWorld(true);

    const glassCenter = new THREE.Vector3();
    let foundGlass = false;

    lamp.traverse((child) => {
      if (foundGlass || !child.isMesh || !this.isGlassObject(child)) {
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

    this.root.worldToLocal(glassCenter);
    this.fakeLampPositions.push(glassCenter.clone());
  }

  createFakeLampLighting() {
    const count = this.fakeLampPositions.length;
    const bulbGeometry = new THREE.SphereGeometry(0.2, 8, 6);
    const bulbMaterial = new THREE.MeshBasicMaterial({
      color: 0xffefb0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const bulbs = new THREE.InstancedMesh(
      bulbGeometry,
      bulbMaterial,
      count
    );
    bulbs.name = 'FakeLampBulbs';
    bulbs.renderOrder = 3;

    const poolGeometry = new THREE.CircleGeometry(4.8, 24);
    const poolMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffd88a) },
        uOpacity: { value: 0.18 }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec4 localPosition = vec4(position, 1.0);

          #ifdef USE_INSTANCING
            localPosition = instanceMatrix * localPosition;
          #endif

          gl_Position = projectionMatrix * modelViewMatrix * localPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          float distanceFromCenter = distance(vUv, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.05, 0.5, distanceFromCenter))
            * uOpacity;

          if (alpha < 0.005) {
            discard;
          }

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const pools = new THREE.InstancedMesh(
      poolGeometry,
      poolMaterial,
      count
    );
    pools.name = 'FakeLampGroundPools';
    pools.renderOrder = 2;

    const transform = new THREE.Object3D();

    this.fakeLampPositions.forEach((position, index) => {
      transform.position.copy(position);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      bulbs.setMatrixAt(index, transform.matrix);

      transform.position.set(position.x, LAMP_GROUND_Y + 0.09, position.z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.updateMatrix();
      pools.setMatrixAt(index, transform.matrix);
    });

    bulbs.instanceMatrix.needsUpdate = true;
    pools.instanceMatrix.needsUpdate = true;

    this.fakeLampLighting = new THREE.Group();
    this.fakeLampLighting.name = 'FakeLampLighting';
    this.fakeLampLighting.add(pools, bulbs);
    this.root.add(this.fakeLampLighting);
  }

  setLampsOn(on) {
    this.lampsOn = on;

    if (this.fakeLampLighting) {
      this.fakeLampLighting.visible = on;
    }

    this.lampGlassMaterials.forEach((material) => {
      material.emissive.set(on ? 0xffe8a0 : 0x000000);
      material.emissiveIntensity = on ? 1.4 : 0;
    });
  }
}
