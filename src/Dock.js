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
const TALL_LAMP_HEIGHT = 6.5;
const ROAD_LAMP_SPACING = 14;
const ROAD_LAMP_OFFSET = 4.6;
const LAMP_GROUND_Y = 2;
const ROAD_Y = 2.03;
const ROAD_THICKNESS = 0.06;
const ROAD_WIDTH = 6;
const INDUSTRIAL_BUILDING_URL =
  '/assets/models/industrial_buildings_set_-_low_poly_models.glb';
const FORKLIFT_URL = '/assets/models/forklift_low_poly.glb';
const FORKLIFT = {
  position: new THREE.Vector3(15, 2, 60),
  width: 1.7,
  length: 3.5,
  rotationY: Math.PI / 4
};
const FUEL_TRUCK_URL = '/assets/models/fuel_truck.glb';
const FUEL_TRUCK = {
  position: new THREE.Vector3(36, 2, 19),
  width: 3,
  length: 13,
  rotationY: Math.PI / 2
};
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

export class Dock {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Dock';

    this.createPlatform();
    this.createRoad();
    this.createRoadMarkings();
    this.createDepot();
    this.loading = Promise.all([
      this.createStreetLamps(),
      this.createIndustrialBuildings(),
      this.createForklift(),
      this.createFuelTruck()
    ]);

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
  }

  async createForklift() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(FORKLIFT_URL);

    this.forklift = this.createAsset(gltf.scene, FORKLIFT, 'Forklift');
  }

  async createFuelTruck() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(FUEL_TRUCK_URL);

    this.fuelTruck = this.createAsset(gltf.scene, FUEL_TRUCK, 'FuelTruck');
  }

  createIndustrialAsset(sourceScene, config) {
    const source = sourceScene.getObjectByName(config.name);

    if (!source) {
      throw new Error(`${config.name} was not found in the industrial GLB`);
    }

    return this.createAsset(source, config, config.name);
  }

  createAsset(source, config, name) {
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
    this.root.add(asset);

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
