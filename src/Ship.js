import * as THREE from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';

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

    this.root.position.set(-15, 0, 0);

    this.isDocked = true;
    this.tween = null;
  }

  addCargo(cargo, position) {
    cargo.position.copy(position);
    this.cargoRoot.add(cargo);
  }

  detachCargo(cargo, newParent) {
    newParent.attach(cargo);
  }

  toggle() {
    if (this.tween?.isPlaying()) return;

    const targetX = this.isDocked ? -100 : -15;

    this.tween = new Tween(this.root.position, false)
      .to({ x: targetX }, 3000)
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
