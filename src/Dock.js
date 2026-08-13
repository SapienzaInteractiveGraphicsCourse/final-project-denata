import * as THREE from 'three';
import { CargoSlots } from './CargoSlots.js';

const DEPOT_ORIGIN = { x: -16, y: 2, z: 42 };
const DEPOT_SPACING = 8;
const DEPOT_COLS = 3;
const DEPOT_ROWS = 4;

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
          DEPOT_ORIGIN.x + (col - colOffset) * DEPOT_SPACING,
          DEPOT_ORIGIN.y,
          DEPOT_ORIGIN.z + (row - rowOffset) * DEPOT_SPACING
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

    this.root.add(this.roadMarkings);
  }

  createDepot() {
    this.depotRoot = new THREE.Group();
    this.depotRoot.name = 'Depot';
    this.root.add(this.depotRoot);

    this.depotSlots = new CargoSlots(this.depotRoot, createDepotLayout());
  }
}