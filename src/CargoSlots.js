import * as THREE from 'three';

export class CargoSlots {
  constructor(parent, definitions, maxStack = 3) {
    this.parent = parent;
    this.maxStack = maxStack;
    this.stackHeight = 0;
    this.slots = new Map();

    definitions.forEach(({ id, position, rotationY = 0 }) => {
      const anchor = new THREE.Object3D();
      anchor.name = `Slot_${id}`;
      anchor.position.copy(position);
      anchor.rotation.y = rotationY;
      parent.add(anchor);

      this.slots.set(id, { anchor, stack: [] });
    });
  }

  measureStackHeight(cargo) {
    if (this.stackHeight > 0) {
      return;
    }

    cargo.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cargo);
    const size = box.getSize(new THREE.Vector3());
    this.stackHeight = size.y;
  }

  place(cargo, slotId) {
    const slot = this.slots.get(slotId);

    if (!slot || slot.stack.length >= this.maxStack) {
      return false;
    }

    slot.anchor.add(cargo);
    cargo.rotation.set(0, 0, 0);
    cargo.scale.set(1, 1, 1);
    cargo.position.set(0, 0, 0);
    this.measureStackHeight(cargo);
    cargo.position.set(0, slot.stack.length * this.stackHeight, 0);
    slot.stack.push(cargo);

    return true;
  }

  remove(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot || slot.stack.length === 0) {
      return null;
    }

    const cargo = slot.stack.pop();
    slot.anchor.remove(cargo);

    return cargo;
  }

  peek(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot || slot.stack.length === 0) {
      return null;
    }

    return slot.stack[slot.stack.length - 1];
  }

  transferTo(slotId, targetSlots, targetSlotId) {
    const cargo = this.peek(slotId);
    const target = targetSlots.slots.get(targetSlotId);

    if (!cargo || !target || target.stack.length >= targetSlots.maxStack) {
      return false;
    }

    this.remove(slotId);
    return targetSlots.place(cargo, targetSlotId);
  }

  findEmpty() {
    for (const [id, slot] of this.slots) {
      if (slot.stack.length === 0) {
        return id;
      }
    }

    return null;
  }

  findAvailable() {
    for (const [id, slot] of this.slots) {
      if (slot.stack.length < this.maxStack) {
        return id;
      }
    }

    return null;
  }

  hasRoom(slotId) {
    const slot = this.slots.get(slotId);
    return Boolean(slot && slot.stack.length < this.maxStack);
  }

  isOccupied(slotId) {
    return Boolean(this.slots.get(slotId)?.stack.length);
  }

  getWorldPosition(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot) {
      return null;
    }

    return slot.anchor.getWorldPosition(new THREE.Vector3());
  }

  getTopWorldPosition(slotId) {
    const cargo = this.peek(slotId);

    if (!cargo) {
      return this.getWorldPosition(slotId);
    }

    cargo.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cargo);
    return box.getCenter(new THREE.Vector3());
  }

  getPlaceWorldPosition(slotId) {
    const slot = this.slots.get(slotId);

    if (!slot) {
      return null;
    }

    const position = slot.anchor.getWorldPosition(new THREE.Vector3());
    position.y += slot.stack.length * this.stackHeight;
    return position;
  }
}
