import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Crane {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Crane';
    this.model = null;
    this.parts = {};

    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      '/assets/models/Crane_Modified2.glb',
      (gltf) => {
        const model = gltf.scene;

        model.scale.setScalar(0.5885823965072632);
        model.rotation.y = -Math.PI / 2;
        model.updateMatrixWorld(true);

        const base = model.getObjectByName('Base_Base_Platform');
        const wheels = model.getObjectByName('Base_Crane_Wheel_Set');
        const baseBox = new THREE.Box3().setFromObject(base);
        const wheelBox = new THREE.Box3().setFromObject(wheels);
        const baseCenter = baseBox.getCenter(new THREE.Vector3());

        model.position.set(
          -baseCenter.x,
          -wheelBox.min.y,
          -baseCenter.z
        );

        const partNames = [
          'Crane_CTRL_Empty',
          'Base_Base_Platform',
          'Base_Crane_Wheel_Set',
          'Platform_Body',
          'Boom',
          'Cables_front_arcs',
          'Cable_rear_arcs',
          'Crane_Spreader',
          'Crane_Tower',
          'Installations',
          'Piston',
          'Rear_cables',
          'Upper_Cable_01',
          'Upper_Cable_02',
          'Upper_Cable_03',
          'Upper_Cable_04',
          'Upper_Cable_05',
          'Upper_Cable_06',
          'Vertical_Cables'
        ];

        partNames.forEach((name) => {
          this.parts[name] = model.getObjectByName(name);
        });

        this.model = model;
        this.root.add(model);
      },
      undefined,
      (error) => {
        console.error('Error loading crane:', error);
      }
    );
  }
}
