import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Ship } from './Ship.js';
import { Truck } from './Truck.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(160, 150, 160);
camera.lookAt(0, 0, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CAMERA CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 400;
controls.update();

// LIGHTS
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(10, 20, 10);
scene.add(sun);

// SEA
const sea = new THREE.Mesh(
  new THREE.BoxGeometry(260, 0.2, 140),
  new THREE.MeshStandardMaterial({ color: 0x168aad })
);
sea.position.set(0, -0.2, -64);
scene.add(sea);

// DOCK
const dock = new THREE.Mesh(
  new THREE.BoxGeometry(180, 5, 80),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
dock.position.set(0, -0.5, 46);
scene.add(dock);

// ROAD
const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x30343b,
  roughness: 0.9
});

const horizontalRoad = new THREE.Mesh(
  new THREE.BoxGeometry(50, 0.06, 8),
  roadMaterial
);
horizontalRoad.position.set(-65, 2.03, 20);
scene.add(horizontalRoad);

function createQuarterTurn(innerRadius, outerRadius) {
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

const curvedRoad = new THREE.Mesh(createQuarterTurn(4, 12), roadMaterial);
curvedRoad.position.set(-40, 2, 28);
scene.add(curvedRoad);

const verticalRoad = new THREE.Mesh(
  new THREE.BoxGeometry(8, 0.06, 48),
  roadMaterial
);
verticalRoad.position.set(-32, 2.03, 52);
scene.add(verticalRoad);

const roadMarkings = new THREE.Group();
const markingGeometry = new THREE.BoxGeometry(3, 0.02, 0.12);
const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d35f });

for (let x = -84; x <= -44; x += 8) {
  const marking = new THREE.Mesh(markingGeometry, markingMaterial);
  marking.position.set(x, 2.07, 20);
  roadMarkings.add(marking);
}

for (let z = 34; z <= 72; z += 8) {
  const marking = new THREE.Mesh(markingGeometry, markingMaterial);
  marking.position.set(-32, 2.07, z);
  marking.rotation.y = -Math.PI / 2;
  roadMarkings.add(marking);
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
  roadMarkings.add(marking);
}

scene.add(roadMarkings);

// TRUCK
const truck = new Truck();
scene.add(truck.root);

// SHIP PLACEHOLDER
const ship = new Ship();
scene.add(ship.root);

// CONTAINER IMPORTED FROM GLB
const loader = new GLTFLoader();

loader.load(
  '/assets/models/20ft_container.glb',

  (gltf) => {
    const containers = gltf.scene;

    // Initial position on the dock
    containers.position.set(0, 2, 10);

    scene.add(containers);

    // Model dimensions
    const box = new THREE.Box3().setFromObject(containers);
    const size = new THREE.Vector3();
    box.getSize(size);

    console.log('Container loaded:', containers);
    console.log(
      `Model dimensions: x=${size.x.toFixed(2)}, y=${size.y.toFixed(2)}, z=${size.z.toFixed(2)}`
    );

    const cargoPositions = [
      [-8, 4.5, -2.5],
      [0, 4.5, -2.5],
      [8, 4.5, -2.5],
      [-8, 4.5, 2.5],
      [0, 4.5, 2.5],
      [8, 4.5, 2.5]
    ];

    cargoPositions.forEach(([x, y, z], index) => {
      const cargo = containers.clone(true);
      cargo.name = `ShipContainer-${index + 1}`;
      cargo.rotation.y = Math.PI / 2;
      ship.addCargo(cargo, new THREE.Vector3(x, y, z));
    });
  },

  undefined,

  (error) => {
    console.error('Error loading container:', error);
  }
);

// SPACE = ARRIVE / DEPART
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    ship.toggle();
  }

  if (event.code === 'KeyT' && !event.repeat) {
    truck.toggle();
  }
});

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// LOOP
function animate(time) {
  ship.update(time);
  truck.update(time);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
