import * as THREE from 'three';

export class CargoSlots {
  constructor(parent, definitions) {
    this.parent = parent;
    this.slots = new Map();

    definitions.forEach(({ id, position, rotationY = 0 }) => {
      const anchor = new THREE.Object3D();
      anchor.name = `Slot_${id}`;
      anchor.position.copy(position);
      anchor.rotation.y = rotationY;
      parent.add(anchor);

      this.slots.set(id, { anchor, cargo: null });
    });
  }

  place(cargo, slotId) {
    const slot = this.slots.get(slotId);

    if (!slot || slot.cargo) {
      return false;
    }

    slot.anchor.add(cargo);
    cargo.position.set(0, 0, 0);
    cargo.rotation.set(0, 0, 0);
    slot.cargo = cargo;

    return true;
  }

  remove(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot?.cargo) {
      return null;
    }

    const cargo = slot.cargo;
    slot.anchor.remove(cargo);
    slot.cargo = null;

    return cargo;
  }

  transferTo(slotId, targetSlots, targetSlotId) {
    const source = this.slots.get(slotId);
    const target = targetSlots.slots.get(targetSlotId);

    if (!source?.cargo || !target || target.cargo) {
      return false;
    }

    const cargo = source.cargo;
    target.anchor.attach(cargo);
    cargo.position.set(0, 0, 0);
    cargo.rotation.set(0, 0, 0);

    source.cargo = null;
    target.cargo = cargo;

    return true;
  }

  findEmpty() {
    for (const [id, slot] of this.slots) {
      if (!slot.cargo) {
        return id;
      }
    }

    return null;
  }

  isOccupied(slotId) {
    return Boolean(this.slots.get(slotId)?.cargo);
  }

  getWorldPosition(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot) {
      return null;
    }

    return slot.anchor.getWorldPosition(new THREE.Vector3());
  }
}
