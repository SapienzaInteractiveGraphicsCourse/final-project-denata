import * as THREE from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';
import { CargoSlots } from './CargoSlots.js';

const SHIP_SLOT_LAYOUT = [
  { id: 'S1', position: new THREE.Vector3(-8, 4.5, -2.5), rotationY: Math.PI / 2 },
  { id: 'S2', position: new THREE.Vector3(0, 4.5, -2.5), rotationY: Math.PI / 2 },
  { id: 'S3', position: new THREE.Vector3(8, 4.5, -2.5), rotationY: Math.PI / 2 },
  { id: 'S4', position: new THREE.Vector3(-8, 4.5, 2.5), rotationY: Math.PI / 2 },
  { id: 'S5', position: new THREE.Vector3(0, 4.5, 2.5), rotationY: Math.PI / 2 },
  { id: 'S6', position: new THREE.Vector3(8, 4.5, 2.5), rotationY: Math.PI / 2 }
];

export class Ship {
  constructor() {
    this.root = new THREE.Group();

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(50, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xff7043 })
    );

    mesh.position.y = 1.5;
    this.root.add(mesh);

    this.cargoRoot = new THREE.Group();
    this.cargoRoot.name = 'ShipCargo';
    this.root.add(this.cargoRoot);

    this.slots = new CargoSlots(this.cargoRoot, SHIP_SLOT_LAYOUT, 3);

    this.root.position.set(-15, 0, 0);

    this.isDocked = true;
    this.tween = null;
  }

  toggle() {
    if (this.tween?.isPlaying()) return;

    const targetX = this.isDocked ? -100 : -15;

    this.tween = new Tween(this.root.position, false)
      .to({ x: targetX }, 9000)
      .easing(Easing.Quadratic.InOut)
      .onComplete(() => {
        this.isDocked = !this.isDocked;
      })
      .start();
  }

  update(time) {
    this.tween?.update(time);
  }
}