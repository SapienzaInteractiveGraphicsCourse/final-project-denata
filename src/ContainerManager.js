import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enableShadows } from './Lighting.js';

export const CONTAINER_SIZE = new THREE.Vector3(2.54, 2.7, 6.11);

const CONTAINER_TYPES = [
  { id: 'classic', url: '/assets/models/20ft_container.glb', weight: 2 },
  {
    id: 'cargo-blue',
    url: '/assets/models/containers/cargo_container_new.glb',
    objectName: 'Object_6',
    weight: 1
  },
  {
    id: 'cargo-green',
    url: '/assets/models/containers/cargo_container_new.glb',
    objectName: 'Object_8',
    weight: 1
  },
  {
    id: 'cargo-red',
    url: '/assets/models/containers/cargo_container_new.glb',
    objectName: 'Object_10',
    weight: 1
  },
  {
    id: 'container',
    url: '/assets/models/containers/container.glb',
    weight: 1
  },
  {
    id: 'container-3d',
    url: '/assets/models/containers/container_3d_model.glb',
    weight: 1
  },
  {
    id: 'sea-cargo',
    url: '/assets/models/containers/sea_cargo_container_-_legendarygamedev.glb',
    weight: 2
  },
  {
    id: 'shipping',
    url: '/assets/models/containers/shipping_container.glb',
    weight: 2
  },
  {
    id: 'shipping-blue',
    url: '/assets/models/containers/shipping_containers.glb',
    objectName: 'Cylinder023',
    weight: 1
  },
  {
    id: 'shipping-green',
    url: '/assets/models/containers/shipping_containers.glb',
    objectName: 'Cylinder025',
    weight: 1
  },
  {
    id: 'shipping-red',
    url: '/assets/models/containers/shipping_containers.glb',
    objectName: 'Cylinder028',
    weight: 1
  }
];

export class ContainerManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.files = new Map();
    this.templates = [];
    this.loading = null;
  }

  load() {
    this.loading ??= Promise.allSettled(
      CONTAINER_TYPES.map(async (type) => {
        const gltf = await this.loadFile(type.url);
        const source = type.objectName
          ? gltf.scene.getObjectByName(type.objectName)
          : gltf.scene;

        if (!source) {
          throw new Error(`Container object not found: ${type.objectName}`);
        }

        return {
          ...type,
          model: this.normalize(source.clone(true))
        };
      })
    ).then((results) => {
      this.templates = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      results
        .filter((result) => result.status === 'rejected')
        .forEach((result) => console.warn(result.reason));

      if (this.templates.length === 0) {
        throw new Error('No container models could be loaded');
      }
    });

    return this.loading;
  }

  createRandom() {
    if (this.templates.length === 0) {
      throw new Error('ContainerManager must be loaded before creating containers');
    }

    let random = Math.random() * this.templates.reduce(
      (total, template) => total + template.weight,
      0
    );

    const selected = this.templates.find((template) => {
      random -= template.weight;
      return random <= 0;
    });

    const container = selected.model.clone(true);
    container.name = `Container-${selected.id}`;
    container.userData.type = selected.id;
    return container;
  }

  loadFile(url) {
    if (!this.files.has(url)) {
      this.files.set(url, this.loader.loadAsync(url));
    }

    return this.files.get(url);
  }

  normalize(model) {
    const root = new THREE.Group();
    const visual = new THREE.Group();
    root.add(visual);
    visual.add(model);

    const box = new THREE.Box3().setFromObject(visual);
    const size = box.getSize(new THREE.Vector3());

    if (size.x > size.z) {
      model.rotation.y += Math.PI / 2;
      box.setFromObject(visual).getSize(size);
    }

    visual.scale.set(
      CONTAINER_SIZE.x / size.x,
      CONTAINER_SIZE.y / size.y,
      CONTAINER_SIZE.z / size.z
    );

    box.setFromObject(visual);
    const center = box.getCenter(new THREE.Vector3());
    visual.position.set(-center.x, -box.min.y, -center.z);
    enableShadows(root);

    return root;
  }
}
